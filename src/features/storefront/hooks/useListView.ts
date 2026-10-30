// A list tab's search text, filters, page and sort, kept in the address (`?q=refund&page=2`), so a link or a reload shows the
// same list. Changes replace the history entry: Back should leave the page, not walk through every keystroke.
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { SortState } from '@/components/ui';
import { clearView, parseView, writeView, type ListView, type ViewSpec } from '../lib/views';

/** The tab's state from the address, and the functions that change it. A filter or search change goes back to page 1. */
export function useListView(spec: ViewSpec) {
  const [params, setParams] = useSearchParams();
  const view: ListView = useMemo(() => parseView(params, spec), [params, spec]);

  const setQuery = useCallback(
    (q: string) => setParams((prev) => writeView(prev, { q, page: 1 }, spec), { replace: true }),
    [setParams, spec],
  );
  const setFilter = useCallback(
    (name: string, value: string) =>
      setParams((prev) => writeView(prev, { filters: { [name]: value }, page: 1 }, spec), { replace: true }),
    [setParams, spec],
  );
  const clear = useCallback(
    () => setParams((prev) => clearView(prev, spec), { replace: true }),
    [setParams, spec],
  );
  const setPage = useCallback(
    (page: number) => setParams((prev) => writeView(prev, { page }, spec), { replace: true }),
    [setParams, spec],
  );
  const setSort = useCallback(
    (sort: SortState) => setParams((prev) => writeView(prev, { sort, page: 1 }, spec), { replace: true }),
    [setParams, spec],
  );

  return { view, setQuery, setFilter, clear, setPage, setSort };
}
