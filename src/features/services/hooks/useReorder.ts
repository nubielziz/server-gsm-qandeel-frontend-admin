// Saving a drop (decision 038), shared by the Group view and the Pricing view: work out the positions that change, show the new order at once, send
// them in ONE call and, when the server refuses or the call fails, give the list back as it was. The caller's `send` shows the refusal (a
// toast with the server's words); two drops never run together.
import { useCallback, useRef, useState } from 'react';
import type { Id } from '@/lib/api';
import { afterMove, dropIndexes, reorderChanges, type PositionChange } from '../lib/reorder';
import { useHeldOrder } from './useHeldOrder';

/**
 * `stored` is the list as the server holds it, in position order. `list` is what to draw (the new order while a save runs); `saving` is
 * true while it does; `move` moves the item at one index to another and says whether it was saved; `drop` takes the ids of a dragged row
 * and the row it was dropped on. `onSaved` hears the item that moved and the index it moved to, after the save and the read that follows it.
 */
export function useReorder<T extends { id: Id; sort: number }>(
  stored: readonly T[],
  send: (changes: PositionChange[]) => Promise<unknown>,
  onSaved?: (item: T, to: number, total: number) => void,
) {
  const { shown, hold, release } = useHeldOrder(stored);
  // A ref, not the saving state: two quick drops before the next render would both pass a state check.
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);

  const move = useCallback(
    async (from: number, to: number): Promise<boolean> => {
      const changes = reorderChanges(shown, from, to);
      if (busy.current || changes.length === 0) return false;
      const item = shown[from];
      busy.current = true;
      setSaving(true);
      hold(afterMove(shown, from, to));
      try {
        await send(changes);
        onSaved?.(item, to, shown.length);
        return true;
      } catch {
        // `send` showed the server's words; the hold is let go below, so the list is what it was.
        return false;
      } finally {
        release();
        busy.current = false;
        setSaving(false);
      }
    },
    [shown, hold, release, send, onSaved],
  );

  const drop = useCallback(
    (activeId: Id, overId: Id) => {
      const at = dropIndexes(shown, activeId, overId);
      if (at) void move(at.from, at.to);
    },
    [shown, move],
  );

  return { list: shown, saving, move, drop };
}
