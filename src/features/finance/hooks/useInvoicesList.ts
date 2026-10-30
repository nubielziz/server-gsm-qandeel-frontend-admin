// The invoices as a Refine list: one page of the invoices that match the filters, sorted by the server. New in the console
// (MISMATCHES M123).
import { useList } from '@refinedev/core';
import type { SortState } from '@/components/ui';
import { toRefineFilters, type ListFilters } from '../lib/refineFilters';
import type { Invoice } from '../types';

export type InvoicesListArgs = {
  filters: ListFilters;
  page: number;
  pageSize: number;
  sort: SortState;
  enabled?: boolean;
};

/** `invoices` is the page, `total` what the server counted for the whole filter; `query` carries loading, error and refetch. */
export function useInvoicesList({ filters, page, pageSize, sort, enabled = true }: InvoicesListArgs) {
  const { result, query } = useList<Invoice>({
    resource: 'invoices',
    pagination: { currentPage: page, pageSize },
    sorters: [{ field: sort.field, order: sort.order }],
    filters: toRefineFilters(filters),
    queryOptions: { enabled },
    // The table shows its own error state with Retry, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { invoices: result.data, total: result.total, query };
}
