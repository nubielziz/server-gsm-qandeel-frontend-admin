// Payment routes (`/admin/payments*`): the deposit review queue and its two decisions. Ports the data side of the
// Deposits tab in 45-p-finance.js (paymentsTab, payDialog, reviewPayment); the map gives no bodies (MISMATCHES M10).
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
import type { Payment, RejectPaymentBody } from '../types';

/**
 * Payments, one page of them, with the total in `x-total-count`. The Deposits tab asks for `purpose=topup` and one
 * `status` (`pending`, `approved`, `rejected`); its sub-tab counts and the header's "waiting for review" figure are
 * this call with `_start=0&_end=1`. Sort with `_sort`/`_order` (`createdAt`, `id`, `amount`, `status`).
 * Assumed contract: rows carry the merchant (`client`) and the gateway as joins, and `netAmount`.
 * @route GET /admin/payments
 */
export function listPayments(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<Payment>> {
  return apiList<Payment>('/admin/payments', query, undefined, init);
}

/**
 * One payment, for the review dialog: it opens from a link (the audit log, a ledger entry) that has no list row, and
 * it asks again after a decision so the dialog shows what the server holds.
 * Assumed contract: same shape as a list row.
 * @route GET /admin/payments/:id
 */
export function getPayment(id: Id, init?: ApiInit): Promise<Payment> {
  return apiGet<Payment>(pathOf('/admin/payments/:id', { id }), undefined, init);
}

/**
 * Approves a pending deposit: the server credits the merchant's wallet and posts the ledger entry. It is a decision
 * on real money, so the server checks the state and the permission; the console shows its answer, error included.
 * Assumed contract: no body; the answer is the updated payment.
 * @route POST /admin/payments/:id/approve
 */
export function approvePayment(id: Id, init?: ApiInit): Promise<Payment> {
  return apiPost<Payment>(pathOf('/admin/payments/:id/approve', { id }), undefined, init);
}

/**
 * Rejects a pending deposit with a reason the merchant sees. No money moves.
 * Assumed contract: the body is `{ reason }`; the answer is the updated payment.
 * @route POST /admin/payments/:id/reject
 */
export function rejectPayment(id: Id, body: RejectPaymentBody, init?: ApiInit): Promise<Payment> {
  return apiPost<Payment>(pathOf('/admin/payments/:id/reject', { id }), body, init);
}
