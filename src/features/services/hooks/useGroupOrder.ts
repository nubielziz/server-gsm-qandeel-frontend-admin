// The order of the groups of the Group view: what a drop of a row and the up and down buttons do. Both save with ONE call
// (`POST /admin/service-categories/order`, only the groups whose position changed), show the new order at once without waiting for the
// server, and give the list back when the server refuses (the toast with the server's words comes from the mutation). The lists are read
// again in the background after the last save (`useReorder`, decision 042).
import { useCallback, useState } from 'react';
import type { Id } from '@/lib/api';
import { stepIndexes } from '../lib/groupList';
import type { PositionChange } from '../lib/reorder';
import type { ServiceCategory } from '../types';
import { useGroupRefresh, useSaveGroupOrder } from './useGroupActions';
import { useReorder } from './useReorder';

/**
 * `stored` is the groups of the kind in their stored order. `list` is what to draw (the new order from a drop on); `saving` is true
 * until the lists have been read again; `drop` takes a row dropped on another; `step` is the up and down buttons; `told` is the sentence for the status line
 * about the last order that was saved.
 */
export function useGroupOrder(stored: readonly ServiceCategory[]) {
  const { mutateAsync } = useSaveGroupOrder();
  const refresh = useGroupRefresh();
  const [told, setTold] = useState('');
  const send = useCallback((items: PositionChange[]) => mutateAsync({ items }), [mutateAsync]);
  const onSaved = useCallback(
    (group: ServiceCategory, to: number, total: number) =>
      setTold(`${group.name} moved to position ${to + 1} of ${total}`),
    [],
  );
  const { list, saving, move, drop } = useReorder(stored, send, refresh, onSaved);

  /** The up and down buttons: the same save as a drop over one place. */
  const step = useCallback(
    (id: Id, direction: 'up' | 'down') => {
      const at = stepIndexes(list, id, direction);
      if (at) void move(at.from, at.to);
    },
    [list, move],
  );

  return { list, saving, drop, step, told };
}
