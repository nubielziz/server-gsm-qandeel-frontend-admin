// The refunds as a Refine list: one page of the rows with the chosen status, sorted by the server. Ports the data side of
// refundRows / tabRefunds (53-p-refunds.js), which filtered an in-memory array.
import { useList } from '@refinedev/core';
import type { SortState } from '@/components/ui';
import type { Refund, RefundStatus } from '../types';
import { REFRESH_MS } from './keys';

export type RefundsListArgs = {
  /** The status filter; empty means all. */
  status: RefundStatus | '';
  page: number;
  pageSize: number;
  sort: SortState;
  enabled?: boolean;
};

/**
 * `refunds` is the page, `total` what the server counted for the whole filter; `query` carries loading, error and refetch.
 * The list asks again every 30 seconds so a new request shows up without a reload.
 */
export function useRefundsList({ status, page, pageSize, sort, enabled = true }: RefundsListArgs) {
  const { result, query } = useList<Refund>({
    resource: 'refunds',
    pagination: { currentPage: page, pageSize },
    sorters: [{ field: sort.field, order: sort.order }],
    filters: status ? [{ field: 'status', operator: 'eq', value: status }] : [],
    queryOptions: { enabled, refetchInterval: REFRESH_MS },
    // The table shows its own error state with Retry, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { refunds: result.data, total: result.total, query };
}
