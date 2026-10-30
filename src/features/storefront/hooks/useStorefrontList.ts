// One page of a storefront resource as a Refine list: the rows that match the filters, sorted and counted by the server. Ports
// the data side of the four list tabs of pageStorefront (50-p-storefront.js). Nothing here decides which rows match.
import { useList, type BaseRecord, type CrudFilters } from '@refinedev/core';
import type { SortState } from '@/components/ui';

/** What a storefront list asks the server for. */
export type StorefrontListArgs = {
  filters: CrudFilters;
  page: number;
  pageSize: number;
  sort?: SortState;
  enabled?: boolean;
};

/** `rows` is the page, `total` what the server counted for the whole filter; `query` carries loading, error and refetch. */
export function useStorefrontList<T extends BaseRecord>(
  resource: string,
  { filters, page, pageSize, sort, enabled = true }: StorefrontListArgs,
) {
  const { result, query } = useList<T>({
    resource,
    pagination: { currentPage: page, pageSize },
    sorters: sort ? [{ field: sort.field, order: sort.order }] : undefined,
    filters,
    queryOptions: { enabled },
    // The table shows its own error state with Retry, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { rows: result.data, total: result.total, query };
}
