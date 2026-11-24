// The accounts as a Refine list: one page of the rows that match the strip and the toolbar, sorted by the server. Ports the data side of
// merRows in 42-p-merchants.js and the list of pageCustomers in 48-p-customers.js, for every rank.
import { useList } from '@refinedev/core';
import type { SortState } from '@/components/ui';
import { toRefineFilters } from '../lib/filters';
import type { AccountListFilters, AccountRow } from '../types';
import { REFRESH_MS } from './keys';

/** What the account list needs: the filters, the page, the page size and the sort. */
export type AccountsListArgs = {
  filters: AccountListFilters;
  page: number;
  pageSize: number;
  sort: SortState;
  enabled?: boolean;
};

/**
 * `accounts` is the page, `total` what the server counted for the whole filter; `query` carries loading, error and refetch. The list asks
 * again every 30 seconds so a new sign-up shows up without a reload.
 */
export function useAccountsList({ filters, page, pageSize, sort, enabled = true }: AccountsListArgs) {
  const { result, query } = useList<AccountRow>({
    resource: 'clients',
    pagination: { currentPage: page, pageSize },
    sorters: [{ field: sort.field, order: sort.order }],
    filters: toRefineFilters(filters),
    queryOptions: { enabled, refetchInterval: REFRESH_MS },
    // The table shows its own error state with Retry, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { accounts: result.data, total: result.total, query };
}
