// The drag and drop of the Pricing view (decisions 038 and 042): the services of one chosen group, in full on the page, are dragged to a new
// place and the positions that changed are saved with ONE `POST /admin/services/order` per drop. The new order shows at once and nothing
// waits for the server: the grips stay on, the saves go out in order, and the grid is read again once, in the background, after the last
// one. A refusal gives the list back (a toast with the server's words). Where the page is not the whole group, or a search or typed
// positions are on, dragging is off and the view says why.
import { useCallback } from 'react';
import type { Id } from '@/lib/api';
import { useReorder } from '../../../hooks/useReorder';
import { useSaveServiceOrder, useServiceOrderRefresh } from '../../../hooks/useSaveServiceOrder';
import { serviceDragState } from '../../../lib/serviceOrder';
import type { PositionChange } from '../../../lib/reorder';
import type { PriceGridRow } from '../../../types';
import type { Lock } from './priceColumns';

/** What the view tells the hook about the page on screen. */
export type ServiceDragInput = {
  rows: readonly PriceGridRow[];
  total: number | undefined;
  stale: boolean;
  q: string;
  group: Id | undefined;
  page: number;
  /** The lock of `catalog:update`. */
  lock: Lock;
  /** How many Order boxes hold typed, unsaved positions. */
  typedPositions: number;
};

/** `list` is the rows to draw, `dragging` says whether the grips work and why not, `drop` is what a drop of a row calls. */
export function useServiceDrag({
  rows,
  total,
  stale,
  q,
  group,
  page,
  lock,
  typedPositions,
}: ServiceDragInput) {
  const { mutateAsync } = useSaveServiceOrder({ dropped: true });
  const refresh = useServiceOrderRefresh();
  const send = useCallback((items: PositionChange[]) => mutateAsync({ items }), [mutateAsync]);
  const { list, saving, drop } = useReorder(rows, send, refresh);
  const dragging = serviceDragState({
    lock,
    typedPositions,
    q,
    group,
    page,
    rows: rows.length,
    total,
    stale,
  });
  return { list, saving, dragging, drop };
}
