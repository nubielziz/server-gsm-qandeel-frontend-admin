// The sub-filters, page and sort of one refunds view, kept in the address (`?status=failed&page=2`), so a link or a reload shows the
// same list. Changes replace the history entry (Back should leave the page, not walk through every click) and keep every other key,
// the Money page's `view` included.
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { SortState } from '@/components/ui';
import {
  parsePage,
  parseSort,
  parseView,
  writePage,
  writeSort,
  writeView,
  type RefundTab,
} from '../lib/view';
import type { PaymentMethod, RefundStatus } from '../types';

/** `tab` is the table the view shows; it decides which sort is read and written. */
export function useRefundView(tab: RefundTab) {
  const [params, setParams] = useSearchParams();
  const view = useMemo(() => parseView(params), [params]);
  const sort = useMemo(() => parseSort(params, tab), [params, tab]);
  const page = parsePage(params);

  /** A new sub-filter goes back to page 1. */
  const setStatus = useCallback(
    (status: RefundStatus | '') =>
      setParams((prev) => writePage(writeView(prev, { status }), 1), { replace: true }),
    [setParams],
  );
  const setMethod = useCallback(
    (method: PaymentMethod | '') =>
      setParams((prev) => writePage(writeView(prev, { method }), 1), { replace: true }),
    [setParams],
  );
  const setPage = useCallback(
    (next: number) => setParams((prev) => writePage(prev, next), { replace: true }),
    [setParams],
  );
  const setSort = useCallback(
    (next: SortState) => setParams((prev) => writeSort(prev, next, tab), { replace: true }),
    [setParams, tab],
  );

  return { view, page, sort, setStatus, setMethod, setPage, setSort };
}
