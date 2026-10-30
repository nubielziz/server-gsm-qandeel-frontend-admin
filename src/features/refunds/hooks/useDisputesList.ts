// The card disputes as a Refine list: one page of them, sorted by the server (by evidence deadline unless the address says
// otherwise). Ports the data side of tabDisputes (53-p-refunds.js).
import { useList } from '@refinedev/core';
import type { SortState } from '@/components/ui';
import type { Dispute } from '../types';
import { REFRESH_MS } from './keys';

export type DisputesListArgs = {
  page: number;
  pageSize: number;
  sort: SortState;
  enabled?: boolean;
};

/** `disputes` is the page, `total` what the server counted; `query` carries loading, error and refetch. */
export function useDisputesList({ page, pageSize, sort, enabled = true }: DisputesListArgs) {
  const { result, query } = useList<Dispute>({
    resource: 'disputes',
    pagination: { currentPage: page, pageSize },
    sorters: [{ field: sort.field, order: sort.order }],
    queryOptions: { enabled, refetchInterval: REFRESH_MS },
    // The table shows its own error state with Retry, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { disputes: result.data, total: result.total, query };
}
