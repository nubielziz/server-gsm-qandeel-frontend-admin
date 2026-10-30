// The data requests as a Refine list: one page of them for the Data requests tab, or one customer's requests (a filter on
// `customerId`) for the Consents and data tab. Needs `customers:privacy`, so callers pass `enabled`.
import { useList } from '@refinedev/core';
import type { SortState } from '@/components/ui';
import { toRefineFilters } from '../lib/filters';
import type { DataRequest, DataRequestFilters } from '../types';

export type DataRequestsArgs = {
  filters?: DataRequestFilters;
  page: number;
  pageSize: number;
  sort: SortState;
  enabled?: boolean;
};

/** `requests` is the page, `total` what the server counted for the whole filter; `query` carries loading, error and refetch. */
export function useDataRequests({ filters = {}, page, pageSize, sort, enabled = true }: DataRequestsArgs) {
  const { result, query } = useList<DataRequest>({
    resource: 'data-requests',
    pagination: { currentPage: page, pageSize },
    sorters: [{ field: sort.field, order: sort.order }],
    filters: toRefineFilters(filters),
    queryOptions: { enabled },
    // The table shows its own error state with Retry, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { requests: result.data, total: result.total, query };
}
