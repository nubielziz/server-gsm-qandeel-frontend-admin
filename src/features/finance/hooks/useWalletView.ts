// The Store balances view's search, state filter, page and sort, kept in the address (`?view=store-balances&state=negative&q=…`). Changes
// replace the history entry, as on the other lists (feature 21).
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { SortState } from '@/components/ui';
import {
  clearWalletFilters,
  parseWalletFilters,
  WALLET_DEFAULT_SORT,
  WALLET_SORT_FIELDS,
  writeWalletFilters,
  type WalletListState,
} from '../lib/walletView';
import { parsePage, parseSort, writePage, writeSort } from '../lib/url';

export function useWalletView() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseWalletFilters(params), [params]);
  const sort = useMemo(() => parseSort(params, WALLET_SORT_FIELDS, WALLET_DEFAULT_SORT), [params]);
  const page = parsePage(params);

  const setFilters = useCallback(
    (patch: Partial<WalletListState>) =>
      setParams((prev) => writePage(writeWalletFilters(prev, patch), 1), { replace: true }),
    [setParams],
  );
  const clearFilters = useCallback(
    () => setParams((prev) => clearWalletFilters(prev), { replace: true }),
    [setParams],
  );
  const setPage = useCallback(
    (next: number) => setParams((prev) => writePage(prev, next), { replace: true }),
    [setParams],
  );
  const setSort = useCallback(
    (next: SortState) =>
      setParams((prev) => writePage(writeSort(prev, next, WALLET_DEFAULT_SORT), 1), { replace: true }),
    [setParams],
  );
  return { filters, page, sort, setFilters, clearFilters, setPage, setSort };
}
