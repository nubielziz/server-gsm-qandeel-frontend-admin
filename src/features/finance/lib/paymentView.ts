// The Deposits tab's status sub-tab and sort as address parameters, and the API filters for each sub-tab. Ports `st.payTab`
// and the row filter of paymentsTab in 45-p-finance.js; the demo filtered in memory, the console asks the server.
import type { SortState } from '@/components/ui';
import type { PaymentStatus } from '../types';
import type { ListFilters } from './refineFilters';

/** The sub-tabs: one status each, and All. */
export type PaymentFilter = PaymentStatus | 'all';

export const PAYMENT_FILTERS: readonly { id: PaymentFilter; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

/** The demo opens on Pending: the deposits waiting for a decision. */
export const DEFAULT_PAYMENT_FILTER: PaymentFilter = 'pending';

/** The columns the server sorts deposits by: Submitted, Deposit, Amount and Status. */
export const PAYMENT_SORT_FIELDS = ['createdAt', 'id', 'amount', 'status'] as const;

/** Newest deposit first, as the demo's table. */
export const PAYMENT_DEFAULT_SORT: SortState = { field: 'createdAt', order: 'desc' };

export function isPaymentFilter(value: string | null): value is PaymentFilter {
  return PAYMENT_FILTERS.some((filter) => filter.id === value);
}

/** The sub-tab in the address, or Pending. */
export function parsePaymentFilter(params: URLSearchParams): PaymentFilter {
  const value = params.get('status');
  return isPaymentFilter(value) ? value : DEFAULT_PAYMENT_FILTER;
}

/**
 * The API filters of a sub-tab. The tab lists wallet top-ups only (`purpose=topup`): storefront order payments are not
 * deposits and never wait for review. The counts use the same filters, so each number is what its sub-tab lists.
 */
export function paymentListFilters(filter: PaymentFilter): ListFilters {
  return { purpose: 'topup', ...(filter === 'all' ? {} : { status: filter }) };
}
