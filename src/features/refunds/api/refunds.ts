// Refund routes (`/admin/refunds*`): the list, one refund and the three decisions. Ports the data side of pageRefunds and the
// approveRefund / declineRefund / retryRefund mutations of 12-state-b2c.js to the API. The map gives no bodies (MISMATCHES M10),
// so every body and answer here is an assumed contract. The server decides every refund (ledger, VAT, gateway); the console
// only sends the choice and shows the answer.
import {
  apiGet,
  apiList,
  apiPost,
  pathOf,
  type ApiInit,
  type Id,
  type ListQuery,
  type ListResult,
} from '@/lib/api';
import type { ApproveRefundBody, DeclineRefundBody, Refund } from '../types';

/**
 * Refund requests and their status, one page of them, with the total in `x-total-count`. Filter by `status`
 * (`requested`, `completed`, `failed`, `rejected`); sort with `_sort`/`_order` (`id`, `amount`, `status`, `createdAt`).
 * The page's counts are this call with `_start=0&_end=1`.
 * Assumed contract: rows carry the customer, the order and the payment as joined summaries (see `Refund`).
 * @route GET /admin/refunds
 */
export function listRefunds(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<Refund>> {
  return apiList<Refund>('/admin/refunds', query, undefined, init);
}

/**
 * One refund, to check a request is still waiting before it is decided (another person may have decided it) and to
 * read the order and payment the approve dialog shows.
 * Assumed contract: same shape as a list row.
 * @route GET /admin/refunds/:id
 */
export function getRefund(id: Id, init?: ApiInit): Promise<Refund> {
  return apiGet<Refund>(pathOf('/admin/refunds/:id', { id }), undefined, init);
}

/**
 * Approves a refund, in full or in part. The server sends the money back through the gateway, reverses the ledger
 * entry (revenue and VAT in proportion to the amount, and the supplier cost is not recovered once the order was
 * delivered) and answers 4xx when it cannot, for example an amount above what was paid.
 * Assumed contract: body `{ amount? }` (a 4-decimal amount; left out means the amount on the request), answer the
 * updated refund with `netAmount` and `taxAmount` filled (an empty answer is fine too).
 * @route POST /admin/refunds/:id/approve
 */
export function approveRefund(
  id: Id,
  body: ApproveRefundBody = {},
  init?: ApiInit,
): Promise<Refund | undefined> {
  return apiPost<Refund | undefined>(pathOf('/admin/refunds/:id/approve', { id }), body, init);
}

/**
 * Declines a refund with a message that reaches the customer by email and is kept with the order.
 * Assumed contract: body `{ reason }`, answer the updated refund.
 * @route POST /admin/refunds/:id/decline
 */
export function declineRefund(id: Id, body: DeclineRefundBody, init?: ApiInit): Promise<Refund | undefined> {
  return apiPost<Refund | undefined>(pathOf('/admin/refunds/:id/decline', { id }), body, init);
}

/**
 * Sends a refund that failed at the gateway again. The server answers 4xx for a refund that did not fail.
 * Assumed contract: no body, answer the updated refund.
 * @route POST /admin/refunds/:id/retry
 */
export function retryRefund(id: Id, init?: ApiInit): Promise<Refund | undefined> {
  return apiPost<Refund | undefined>(pathOf('/admin/refunds/:id/retry', { id }), {}, init);
}
