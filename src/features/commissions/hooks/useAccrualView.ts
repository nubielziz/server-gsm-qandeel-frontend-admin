// The Accruals tab's status, agent, page and sort, kept in the address (`?status=approved&agent=5&page=2`), so a link or a reload
// shows the same list. Changes replace the history entry: Back should leave the page, not walk through every filter.
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { SortState } from '@/components/ui';
import {
  parseAccrualView,
  parsePage,
  parseSort,
  writeAccrualView,
  writeView,
  type AccrualView,
} from '../lib/filters';

/** The filters, page and sort from the address, and the functions that change them. */
export function useAccrualView() {
  const [params, setParams] = useSearchParams();
  const view = useMemo(() => parseAccrualView(params), [params]);
  const sort = useMemo(() => parseSort(params), [params]);
  const page = parsePage(params);

  /** Changes the status or the agent and goes back to page 1. */
  const setView = useCallback(
    (patch: Partial<AccrualView>) =>
      setParams((prev) => writeView(writeAccrualView(prev, patch), { page: 1 }), { replace: true }),
    [setParams],
  );
  const setPage = useCallback(
    (next: number) => setParams((prev) => writeView(prev, { page: next }), { replace: true }),
    [setParams],
  );
  const setSort = useCallback(
    (next: SortState) => setParams((prev) => writeView(prev, { sort: next, page: 1 }), { replace: true }),
    [setParams],
  );

  return { view, page, sort, setView, setPage, setSort };
}
