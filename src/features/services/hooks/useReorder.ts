// Saving a drop (decisions 038 and 042), shared by the Group view and the Pricing view: work out the positions that change, show the new
// order at once, and send them in ONE call. Nothing on screen waits for the server: the grips stay on, so a person drags one row after
// another, and each drop is worked out on the order the last one left. The saves go out one after the other, in the order of the drops; the
// lists are read again once, in the background, a moment after the last save, and the held order stays on screen until that read is in, so
// the table never jumps. When the server refuses a save (or the call fails) the list goes back to the last order the server took, the drops
// made after it are dropped unsent (they were worked out on an order that was never saved), the lists are read again at once, and the
// caller's `save` shows the server's words in a toast.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Id } from '@/lib/api';
import { afterMove, dropIndexes, reorderChanges, type PositionChange } from '../lib/reorder';
import { useHeldOrder } from './useHeldOrder';

/** How long after the last save the lists are read again: drops that follow one another closely share one read. */
export const REFRESH_AFTER_MS = 400;

/**
 * `stored` is the list as the server holds it, in position order. `save` sends the positions that change and rejects when the server
 * refuses; `refresh` reads the lists again (it is not waited for before the next drop). `list` is what to draw (the new order from the
 * drop until the lists have been read again); `saving` is true for that long; `move` moves the item at one index to another and says
 * whether it was saved; `drop` takes the ids of a dragged row and the row it was dropped on. `onSaved` hears the item that moved and the
 * index it moved to, after its save.
 */
export function useReorder<T extends { id: Id; sort: number }>(
  stored: readonly T[],
  save: (changes: PositionChange[]) => Promise<unknown>,
  refresh: () => Promise<unknown>,
  onSaved?: (item: T, to: number, total: number) => void,
) {
  const { shown, hold, release } = useHeldOrder(stored);
  const [saving, setSaving] = useState(false);
  // The list the next drop is worked out on. `move` writes it at once, so a drop made before the next render builds on the one before.
  const latest = useRef(shown);
  const base = useRef(stored);
  useEffect(() => {
    latest.current = shown;
    base.current = stored;
  }, [shown, stored]);
  // The saves of a run of drops: the chain they wait in, how many have not ended, how many drops and failures there were, the last order
  // the server took, and the timer of the read that ends the run.
  const run = useRef({
    queue: Promise.resolve(),
    waiting: 0,
    drops: 0,
    failed: 0,
    confirmed: null as readonly T[] | null,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
  });

  // The view is left with a read still to come: the lists are marked stale now, so the next view that shows them reads them again.
  useEffect(() => {
    const state = run.current;
    return () => {
      if (state.timer === undefined) return;
      clearTimeout(state.timer);
      state.timer = undefined;
      void refresh().catch(() => undefined);
    };
  }, [refresh]);

  /** Reads the lists again after `delay`, then lets the held order go, unless a newer drop has taken over meanwhile. */
  const finish = useCallback(
    (delay: number) => {
      const state = run.current;
      const at = state.drops;
      clearTimeout(state.timer);
      state.timer = setTimeout(() => {
        state.timer = undefined;
        void refresh()
          .catch(() => undefined)
          .finally(() => {
            if (state.drops !== at || state.waiting > 0) return;
            state.confirmed = null;
            release();
            setSaving(false);
          });
      }, delay);
    },
    [refresh, release],
  );

  const move = useCallback(
    (from: number, to: number): Promise<boolean> => {
      const state = run.current;
      const list = latest.current;
      const changes = reorderChanges(list, from, to);
      if (changes.length === 0) return Promise.resolve(false);
      const item = list[from];
      const next = afterMove(list, from, to);
      latest.current = next;
      hold(next);
      setSaving(true);
      clearTimeout(state.timer);
      state.timer = undefined;
      state.drops += 1;
      state.waiting += 1;
      const failedBefore = state.failed;
      const result = state.queue
        .then(async () => {
          // A save before this one failed: this drop was worked out on an order the server never took, so it is not sent.
          if (state.failed !== failedBefore) return false;
          try {
            await save(changes);
          } catch {
            // `save` showed the server's words. Back to the last order the server took (the stored one when it took none).
            state.failed += 1;
            latest.current = state.confirmed ?? base.current;
            if (state.confirmed) hold(state.confirmed);
            else release();
            return false;
          }
          state.confirmed = next;
          onSaved?.(item, to, next.length);
          return true;
        })
        .then((saved) => {
          state.waiting -= 1;
          // After a failure the lists are read at once, so the table shows what the server holds.
          if (state.waiting === 0) finish(saved ? REFRESH_AFTER_MS : 0);
          return saved;
        });
      state.queue = result.then(() => undefined);
      return result;
    },
    [hold, release, save, onSaved, finish],
  );

  const drop = useCallback(
    (activeId: Id, overId: Id) => {
      const at = dropIndexes(latest.current, activeId, overId);
      if (at) void move(at.from, at.to);
    },
    [move],
  );

  return { list: shown, saving, move, drop };
}
