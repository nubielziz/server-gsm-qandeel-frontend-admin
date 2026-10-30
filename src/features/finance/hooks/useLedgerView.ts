// The Ledger tab's search, filters, page and sort, kept in the address (`?q=…&kind=deposit&page=2`), so a link or a reload
// shows the same list. Filter changes replace the history entry: Back should leave the page, not walk through every keystroke.
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { SortState } from '@/components/ui';
import {
  clearLedgerFilters,
  LEDGER_DEFAULT_SORT,
  LEDGER_SORT_FIELDS,
  parseLedgerFilters,
  writeLedgerFilters,
  type LedgerFilters,
} from '../lib/ledgerView';
import { parsePage, parseSort, writePage, writeSort } from '../lib/url';

export function useLedgerView() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseLedgerFilters(params), [params]);
  const sort = useMemo(() => parseSort(params, LEDGER_SORT_FIELDS, LEDGER_DEFAULT_SORT), [params]);
  const page = parsePage(params);

  /** Changes some filters and goes back to page 1. */
  const setFilters = useCallback(
    (patch: Partial<LedgerFilters>) =>
      setParams((prev) => writePage(writeLedgerFilters(prev, patch), 1), { replace: true }),
    [setParams],
  );
  const clearFilters = useCallback(
    () => setParams((prev) => clearLedgerFilters(prev), { replace: true }),
    [setParams],
  );
  const setPage = useCallback(
    (next: number) => setParams((prev) => writePage(prev, next), { replace: true }),
    [setParams],
  );
  const setSort = useCallback(
    (next: SortState) =>
      setParams((prev) => writePage(writeSort(prev, next, LEDGER_DEFAULT_SORT), 1), { replace: true }),
    [setParams],
  );
  return { filters, page, sort, setFilters, clearFilters, setPage, setSort };
}
