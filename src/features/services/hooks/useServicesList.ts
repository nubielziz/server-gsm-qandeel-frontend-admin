// The services as a Refine list: one page of the rows that match the filters, sorted by the server. Ports the data side of
// pageServices / svcRows (43-p-services.js). The catalog does not change by itself, so there is no timed refresh.
import { useList } from '@refinedev/core';
import type { SortState } from '@/components/ui';
import { toRefineFilters } from '../lib/filters';
import type { Service, ServiceListFilters } from '../types';

/** What `useServicesList` asks the server for. */
export type ServicesListArgs = {
  filters: ServiceListFilters;
  page: number;
  pageSize: number;
  sort: SortState;
  enabled?: boolean;
};

/** `services` is the page, `total` what the server counted for the whole filter; `query` carries loading, error and refetch. */
export function useServicesList({ filters, page, pageSize, sort, enabled = true }: ServicesListArgs) {
  const { result, query } = useList<Service>({
    resource: 'services',
    pagination: { currentPage: page, pageSize },
    sorters: [{ field: sort.field, order: sort.order }],
    filters: toRefineFilters(filters),
    queryOptions: { enabled },
    // The table shows its own error state with Retry, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { services: result.data, total: result.total, query };
}
