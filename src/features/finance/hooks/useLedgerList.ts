// The ledger as a Refine list: one page of journal entries that match the filters, sorted by the server. Ports the data side
// of ledgerTab / ledgerRows (45-p-finance.js).
import { useList } from '@refinedev/core';
import type { SortState } from '@/components/ui';
import { toRefineFilters, type ListFilters } from '../lib/refineFilters';
import type { LedgerTransaction } from '../types';

export type LedgerListArgs = {
  filters: ListFilters;
  page: number;
  pageSize: number;
  sort: SortState;
  enabled?: boolean;
};

/** `entries` is the page, `total` what the server counted for the whole filter; `query` carries loading, error and refetch. */
export function useLedgerList({ filters, page, pageSize, sort, enabled = true }: LedgerListArgs) {
  const { result, query } = useList<LedgerTransaction>({
    resource: 'ledger/transactions',
    pagination: { currentPage: page, pageSize },
    sorters: [{ field: sort.field, order: sort.order }],
    filters: toRefineFilters(filters),
    queryOptions: { enabled },
    // The table shows its own error state with Retry, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { entries: result.data, total: result.total, query };
}
