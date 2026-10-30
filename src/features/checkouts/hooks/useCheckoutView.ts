// The checkouts page's filter, search, page, sort and funnel period, kept in the address (`?filter=all&q=sam&page=2`), so a link or a
// reload shows the same list. Changes replace the history entry: Back should leave the page, not walk through every keystroke.
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { SortState } from '@/components/ui';
import {
  clearFilters,
  parseDays,
  parseFilters,
  parsePage,
  parseSort,
  writeFilters,
  writeView,
  type CheckoutFilters,
} from '../lib/filters';
import type { FunnelDays } from '../types';

export function useCheckoutView() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);
  const sort = useMemo(() => parseSort(params), [params]);
  const page = parsePage(params);
  const days = parseDays(params);

  /** Changes the filter or the search and goes back to page 1. */
  const setFilters = useCallback(
    (patch: Partial<CheckoutFilters>) =>
      setParams((prev) => writeView(writeFilters(prev, patch), { page: 1 }), { replace: true }),
    [setParams],
  );
  const clearSearch = useCallback(
    () => setParams((prev) => clearFilters(prev), { replace: true }),
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
  const setDays = useCallback(
    (next: FunnelDays) => setParams((prev) => writeView(prev, { days: next }), { replace: true }),
    [setParams],
  );

  return { filters, page, sort, days, setFilters, clearSearch, setPage, setSort, setDays };
}
