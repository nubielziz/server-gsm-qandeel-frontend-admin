// The customers as a Refine list: one page of the rows that match the filters, sorted by the server. Ports the data side of
// pageCustomers / custRows (48-p-customers.js).
import { useList } from '@refinedev/core';
import type { SortState } from '@/components/ui';
import { toRefineFilters } from '../lib/filters';
import type { Customer, CustomerListFilters } from '../types';

export type CustomersListArgs = {
  filters: CustomerListFilters;
  page: number;
  pageSize: number;
  sort: SortState;
  enabled?: boolean;
};

/** `customers` is the page, `total` what the server counted for the whole filter; `query` carries loading, error and refetch. */
export function useCustomersList({ filters, page, pageSize, sort, enabled = true }: CustomersListArgs) {
  const { result, query } = useList<Customer>({
    resource: 'customers',
    pagination: { currentPage: page, pageSize },
    sorters: [{ field: sort.field, order: sort.order }],
    filters: toRefineFilters(filters),
    queryOptions: { enabled },
    // The table shows its own error state with Retry, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { customers: result.data, total: result.total, query };
}
