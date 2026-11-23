// One page of the Catalog table: the rows that match the chip and the filters, sorted and counted by the server. Ports the data side of
// pageServices / svcRows (43-p-services.js). The key starts with the shared rows key, so a change made elsewhere (a listing switched,
// a publish run applied, a supplier link saved) refreshes the page. The catalog does not change by itself: no timed refresh.
import type { SortState } from '@/components/ui';
import { useApiQuery } from '@/lib/query';
import { listServices } from '../api';
import { toListQuery } from '../lib/filters';
import type { ServiceListFilters } from '../types';
import { SERVICE_ROWS_KEY } from './keys';

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
  const query = useApiQuery({
    queryKey: [...SERVICE_ROWS_KEY, { filters, page, pageSize, sort }],
    queryFn: ({ signal }) =>
      listServices(
        toListQuery(filters, {
          start: (page - 1) * pageSize,
          end: page * pageSize,
          sort: [sort.field],
          order: [sort.order],
        }),
        { signal },
      ),
    enabled,
  });
  return { services: query.data?.data ?? [], total: query.data?.total, query };
}
