// The abandoned checkouts as one page of rows plus the server's total. Ports the data side of checkoutsBody (51-p-checkouts.js).
import { keepPreviousData } from '@tanstack/react-query';
import type { SortState } from '@/components/ui';
import { useApiQuery } from '@/lib/query';
import { listAbandonedCheckouts } from '../api';
import { toListQuery, type CheckoutFilters } from '../lib/filters';
import { CHECKOUTS_KEY, REFRESH_MS } from './keys';

export type AbandonedCheckoutsArgs = {
  filters: CheckoutFilters;
  page: number;
  sort: SortState;
  /** False until the staff member's permissions are known. */
  enabled?: boolean;
};

/**
 * `rows` is the page, `total` what the server counted for the whole filter; `query` carries loading, error and refetch. The previous
 * page stays on screen while the next one loads, and the list asks again every minute so a new abandoned checkout shows up.
 */
export function useAbandonedCheckouts({ filters, page, sort, enabled = true }: AbandonedCheckoutsArgs) {
  const query = useApiQuery({
    queryKey: [...CHECKOUTS_KEY, filters.filter, filters.q.trim(), page, sort.field, sort.order],
    queryFn: ({ signal }) => listAbandonedCheckouts(toListQuery(filters, page, sort), { signal }),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: REFRESH_MS,
  });
  return { rows: query.data?.data ?? [], total: query.data?.total, query };
}
