// A merchant's invoices and payments for the Billing tab: the finance feature's list calls with `clientId`, ten rows a page each.
// Each is enabled only when the staff member may read it (`invoices:read`, `payments:read`).
import { listInvoices, listPayments } from '@/features/finance';
import { useApiQuery } from '@/lib/query';
import { BILLING_PAGE_SIZE } from '../lib/billing';
import { MERCHANT_INVOICES_KEY, MERCHANT_PAYMENTS_KEY } from './keys';

const range = (page: number) => ({ start: (page - 1) * BILLING_PAGE_SIZE, end: page * BILLING_PAGE_SIZE });
const NEWEST = { sort: ['createdAt'], order: ['desc' as const] };

/** One page (1-based) of the merchant's invoices, newest first, with the total in `data.total`. */
export function useMerchantInvoices(clientId: number, page: number, enabled = true) {
  return useApiQuery({
    queryKey: [...MERCHANT_INVOICES_KEY, clientId, page],
    queryFn: ({ signal }) => listInvoices({ ...range(page), ...NEWEST, filters: { clientId } }, { signal }),
    enabled,
  });
}

/** One page (1-based) of the merchant's payments (deposits), newest first. */
export function useMerchantPayments(clientId: number, page: number, enabled = true) {
  return useApiQuery({
    queryKey: [...MERCHANT_PAYMENTS_KEY, clientId, page],
    queryFn: ({ signal }) => listPayments({ ...range(page), ...NEWEST, filters: { clientId } }, { signal }),
    enabled,
  });
}
