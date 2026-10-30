// The numbers on the Deposits sub-tabs and in the header: one count per sub-tab, each the list call with `_start=0&_end=1`
// read from `x-total-count`, so the server does the counting. Ports the `cnt(...)` figures of paymentsTab (45-p-finance.js).
import { useQueries } from '@tanstack/react-query';
import { useApiQuery } from '@/lib/query';
import { listPayments } from '../api';
import { PAYMENT_FILTERS, paymentListFilters, type PaymentFilter } from '../lib/paymentView';
import { PAYMENT_COUNTS_KEY, REFRESH_MS } from './keys';

export type PaymentCounts = Partial<Record<PaymentFilter, number>>;

// How many deposits a sub-tab would list: the list call asked for one row, read from the total.
async function countOf(filter: PaymentFilter, signal: AbortSignal): Promise<number> {
  const { total } = await listPayments({ filters: paymentListFilters(filter), start: 0, end: 1 }, { signal });
  return total;
}

/** `enabled` is false until the staff member's permissions are known, or without `payments:read`. */
export function usePaymentCounts(enabled = true): PaymentCounts {
  const results = useQueries({
    queries: PAYMENT_FILTERS.map((filter) => ({
      queryKey: [...PAYMENT_COUNTS_KEY, filter.id],
      queryFn: ({ signal }: { signal: AbortSignal }) => countOf(filter.id, signal),
      enabled,
      refetchInterval: REFRESH_MS,
    })),
  });
  const counts: PaymentCounts = {};
  PAYMENT_FILTERS.forEach((filter, index) => {
    const count = results[index]?.data;
    if (count !== undefined) counts[filter.id] = count;
  });
  return counts;
}

/**
 * Only the deposits waiting for review: the figure the page header needs on every tab. It shares its key with the
 * Pending count above, so the Deposits tab and the header never ask twice.
 */
export function usePendingDeposits(enabled = true) {
  return useApiQuery({
    queryKey: [...PAYMENT_COUNTS_KEY, 'pending'],
    queryFn: ({ signal }) => countOf('pending', signal),
    enabled,
    refetchInterval: REFRESH_MS,
  });
}
