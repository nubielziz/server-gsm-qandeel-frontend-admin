// The page's tab, sub-filters, page and sort, kept in the address (`?tab=disputes`, `?status=failed&page=2`), so a link or a
// reload shows the same list. Changes replace the history entry: Back should leave the page, not walk through every click.
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { SortState } from '@/components/ui';
import {
  parsePage,
  parseSort,
  parseView,
  writePage,
  writeSort,
  writeTab,
  writeView,
  type RefundTab,
} from '../lib/view';
import type { PaymentMethod, RefundStatus } from '../types';

/**
 * `tab` is the tab a table belongs to; it decides which sort is read and written. The page itself leaves it out and reads
 * `view.tab` (the tab the address names).
 */
export function useRefundView(tab?: RefundTab) {
  const [params, setParams] = useSearchParams();
  const view = useMemo(() => parseView(params), [params]);
  const owner = tab ?? view.tab;
  const sort = useMemo(() => parseSort(params, owner), [params, owner]);
  const page = parsePage(params);

  const setTab = useCallback(
    (next: RefundTab) => setParams((prev) => writeTab(prev, next), { replace: true }),
    [setParams],
  );
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
    (next: SortState) => setParams((prev) => writeSort(prev, next, owner), { replace: true }),
    [setParams, owner],
  );

  return { view, page, sort, setTab, setStatus, setMethod, setPage, setSort };
}
