// The Services tab's filters, page and sort, kept in the address (`?q=…&belowFloor=true&page=2`), so a link or a reload shows
// the same list. Filter changes replace the history entry: Back should leave the page, not walk through every keystroke.
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { SortState } from '@/components/ui';
import {
  clearServiceFilters,
  parsePage,
  parseServiceFilters,
  parseSort,
  writeServiceFilters,
  writeView,
  type ServiceFilters,
} from '../lib/filters';

/** The Services tab's filters, page and sort from the address, and the functions that change them. */
export function useServiceView() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseServiceFilters(params), [params]);
  const sort = useMemo(() => parseSort(params), [params]);
  const page = parsePage(params);

  /** Changes some filters and goes back to page 1. */
  const setFilters = useCallback(
    (patch: Partial<ServiceFilters>) =>
      setParams((prev) => writeView(writeServiceFilters(prev, patch), { page: 1 }), { replace: true }),
    [setParams],
  );
  const clearFilters = useCallback(
    () => setParams((prev) => clearServiceFilters(prev), { replace: true }),
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
