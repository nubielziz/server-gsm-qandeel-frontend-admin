// The merchants page's tab, filters, page and sort, kept in the address (`?tab=suspended&q=…&page=2`), so a
// link or a reload shows the same list. Changes replace the history entry: Back should leave the page, not walk through every
// keystroke of a search.
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { SortState } from '@/components/ui';
import {
  clearMerchantFilters,
  parseMerchantFilters,
  parseMerchantTab,
  parsePage,
  parseSort,
  writeMerchantFilters,
  writeTab,
  writeView,
  type MerchantFilters,
} from '../lib/filters';
import type { MerchantTab } from '../lib/status';

/** `visible` is the tabs the staff member may open; an address naming any other tab falls back to the first of them. */
export function useMerchantView(visible: readonly MerchantTab[]) {
  const [params, setParams] = useSearchParams();
  const tab = parseMerchantTab(params, visible);
  const filters = useMemo(() => parseMerchantFilters(params), [params]);
  const sort = useMemo(() => parseSort(params), [params]);
  const page = parsePage(params);

  const setTab = useCallback(
    (next: MerchantTab) => setParams((prev) => writeTab(prev, next), { replace: true }),
    [setParams],
  );
  /** Changes some filters and goes back to page 1. */
  const setFilters = useCallback(
    (patch: Partial<MerchantFilters>) =>
      setParams((prev) => writeView(writeMerchantFilters(prev, patch), { page: 1 }), { replace: true }),
    [setParams],
  );
  const clearFilters = useCallback(
    () => setParams((prev) => clearMerchantFilters(prev), { replace: true }),
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

  return {
    tab,
    filters,
    sort,
    page,
    setTab,
    setFilters,
    clearFilters,
    setPage,
    setSort,
  };
}
