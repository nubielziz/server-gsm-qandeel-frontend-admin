// The customers page's tab, filters, page and sort, kept in the address (`?tab=flagged&q=…&page=2`), so a link or a reload
// shows the same list. Changes replace the history entry: Back should leave the page, not walk through every keystroke.
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { SortState } from '@/components/ui';
import {
  clearCustomerFilters,
  parseCustomerFilters,
  parsePage,
  parseSort,
  writeCustomerFilters,
  writeView,
  type CustomerFilters,
} from '../lib/filters';

export function useCustomerView() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseCustomerFilters(params), [params]);
  const sort = useMemo(() => parseSort(params), [params]);
  const page = parsePage(params);

  /** Changes some filters and goes back to page 1. */
  const setFilters = useCallback(
    (patch: Partial<CustomerFilters>) =>
      setParams((prev) => writeView(writeCustomerFilters(prev, patch), { page: 1 }), { replace: true }),
    [setParams],
  );
  const clearFilters = useCallback(
    () => setParams((prev) => clearCustomerFilters(prev), { replace: true }),
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

  return { filters, page, sort, setFilters, clearFilters, setPage, setSort };
}
