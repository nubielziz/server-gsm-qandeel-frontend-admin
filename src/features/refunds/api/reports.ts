// The storefront payments report (`GET /admin/reports/payments`). Ports the data side of tabPayments in 53-p-refunds.js, which
// built the method comparison and the payments table from the orders in the browser. The map gives no answer shape
// (MISMATCHES M10), so the shape is an assumed contract.
import { apiGet, listQueryToParams, type ApiInit } from '@/lib/api';
import type { PaymentsReport, PaymentsReportQuery } from '../types';

/**
 * Storefront payments by method: what each way of paying costs (fees, fee rate), how often it ends in a refund or a
 * dispute, one page of the payments themselves, and the totals the page's strip shows. The server does all the sums.
 * Asked with a `method` filter, a row range (`_start`, `_end`) and a sort (`_sort`, `_order`, the payment's fields:
 * `orderId`, `method`, `amount`, `feeAmount`, `status`, `createdAt`). The comparison of the methods is always whole.
 * Assumed contract: answer `{ methods, payments, total, totals }` (see `PaymentsReport`). The route's "net amount and
 * settlements" have no place in the demo's tab and are not read.
 * @route GET /admin/reports/payments
 */
export function getPaymentsReport(query: PaymentsReportQuery = {}, init?: ApiInit): Promise<PaymentsReport> {
  const { method, start, end, sort, order } = query;
  const params = listQueryToParams(
    {
      start,
      end,
      sort: sort ? [sort] : undefined,
      order: sort && order ? [order] : undefined,
    },
    { method },
  );
  return apiGet<PaymentsReport>('/admin/reports/payments', params, init);
}
