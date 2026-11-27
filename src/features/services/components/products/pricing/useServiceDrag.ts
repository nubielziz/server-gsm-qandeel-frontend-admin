// The drag and drop of the Pricing view (decision 038): the services of one chosen group, in full on the page, are dragged to a new place and the
// positions that changed are saved at once with ONE `POST /admin/services/order`. The new order shows before the server answers and goes back
// when it refuses (a toast with the server's words). Where the page is not the whole group, or a search or typed positions are on, dragging is
// off and the view says why.
import { useCallback } from 'react';
import type { Id } from '@/lib/api';
import { useReorder } from '../../../hooks/useReorder';
import { useSaveServiceOrder } from '../../../hooks/useSaveServiceOrder';
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
  const { mutateAsync } = useSaveServiceOrder({ toastRefusals: true });
  const send = useCallback((items: PositionChange[]) => mutateAsync({ items }), [mutateAsync]);
  const { list, saving, drop } = useReorder(rows, send);
  const dragging = serviceDragState({
    lock,
    saving,
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
