// The campaign list's status, purpose, search and page, kept in the address (`?status=sent&q=ramadan&page=2`), so a link or a reload shows the same
// list. Changes replace the history entry: Back should leave the page, not walk through every keystroke.
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  clearFilterParams,
  parseFilters,
  parsePage,
  writeFilters,
  writePage,
  type CampaignFilters,
} from '../lib/filters';

export function useNotificationsView() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);
  const page = parsePage(params);

  /** Changes a filter or the search and goes back to page 1. */
  const setFilters = useCallback(
    (patch: Partial<CampaignFilters>) => setParams((prev) => writeFilters(prev, patch), { replace: true }),
    [setParams],
  );
  const clearFilters = useCallback(
    () => setParams((prev) => clearFilterParams(prev), { replace: true }),
    [setParams],
  );
  const setPage = useCallback(
    (next: number) => setParams((prev) => writePage(prev, next), { replace: true }),
    [setParams],
  );
  return { filters, page, setFilters, clearFilters, setPage };
}
