// The deposits as a Refine list: one page of the payments in a sub-tab, sorted by the server. Ports the data side of
// paymentsTab (45-p-finance.js).
import { useList } from '@refinedev/core';
import type { SortState } from '@/components/ui';
import { paymentListFilters, type PaymentFilter } from '../lib/paymentView';
import { toRefineFilters } from '../lib/refineFilters';
import type { Payment } from '../types';
import { REFRESH_MS } from './keys';

export type PaymentsListArgs = {
  filter: PaymentFilter;
  page: number;
  pageSize: number;
  sort: SortState;
  enabled?: boolean;
};

/**
 * `payments` is the page, `total` what the server counted for the sub-tab. The list asks again every 30 seconds so a new
 * deposit shows up without a reload.
 */
export function usePaymentsList({ filter, page, pageSize, sort, enabled = true }: PaymentsListArgs) {
  const { result, query } = useList<Payment>({
    resource: 'payments',
    pagination: { currentPage: page, pageSize },
    sorters: [{ field: sort.field, order: sort.order }],
    filters: toRefineFilters(paymentListFilters(filter)),
    queryOptions: { enabled, refetchInterval: REFRESH_MS },
    // The table shows its own error state with Retry, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { payments: result.data, total: result.total, query };
}
