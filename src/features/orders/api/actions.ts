// The order actions (`POST /admin/orders/:id/*`): accept, reply, reject, reopen, refund, verification, notes, and the
// three supplier actions the drawer's Retry and Reroute use. Ports completeOrders / rejectOrders / retryOrders of
// 11-state.js to the API. The map gives no bodies (MISMATCHES M10), so every body here is an assumed contract. The
// server checks every action (state, permission, money); the console only sends it and shows the answer.
import { apiPost, pathOf, type ApiInit, type Id } from '@/lib/api';
import type {
  ChangeSupplierBody,
  OrderNoteBody,
  RefundOrderBody,
  RejectOrderBody,
  ReopenOrderBody,
  ReplyOrderBody,
  VerificationBody,
} from '../types';

/**
 * Accepts an order from the manual queue and moves it to processing. The operator then does the work by hand and
 * completes it with a reply.
 * Assumed contract: body `{}`, no answer used.
 * @route POST /admin/orders/:id/accept
 */
export function acceptOrder(id: Id, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/orders/:id/accept', { id }), {}, init);
}

/**
 * Completes an order with its result: the text (or code) the buyer receives, and an optional comment. The server
 * settles the held money to revenue and the supplier cost to the ledger. A file result comes from the supplier: there
 * is no admin upload route (MISMATCHES M24).
 * Assumed contract: body `{ code, comment? }`, no answer used.
 * @route POST /admin/orders/:id/reply
 */
export function replyOrder(id: Id, body: ReplyOrderBody, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/orders/:id/reply', { id }), body, init);
}

/**
 * Rejects an order with a reason the buyer sees, and refunds it: a merchant gets the held money back in the wallet,
 * a storefront customer gets the payment back on the original method.
 * Assumed contract: body `{ reason }`, no answer used.
 * @route POST /admin/orders/:id/reject
 */
export function rejectOrder(id: Id, body: RejectOrderBody, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/orders/:id/reject', { id }), body, init);
}

/**
 * Reopens a completed order back to processing, so it can be completed or rejected again. Needs the separate
 * `orders:reopen` permission because it reverses a settled sale.
 * Assumed contract: body `{ reason? }`, no answer used.
 * @route POST /admin/orders/:id/reopen
 */
export function reopenOrder(id: Id, body: ReopenOrderBody = {}, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/orders/:id/reopen', { id }), body, init);
}

/**
 * Refunds a completed merchant order (the server reopens it, then rejects it). The supplier cost is not recovered.
 * Storefront orders are refunded from `/admin/refunds`, not here (MISMATCHES M25).
 * Assumed contract: body `{ reason }`, no answer used.
 * @route POST /admin/orders/:id/refund
 */
export function refundOrder(id: Id, body: RefundOrderBody, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/orders/:id/refund', { id }), body, init);
}

/**
 * Answers a verification request: `accept` keeps the delivered result and the charge, `refund` gives the money back.
 * Assumed contract: body `{ decision, note? }`, no answer used.
 * @route POST /admin/orders/:id/verification
 */
export function decideVerification(id: Id, body: VerificationBody, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/orders/:id/verification', { id }), body, init);
}

/**
 * Adds an internal note to the order's timeline. Buyers never see it.
 * Assumed contract: body `{ body }`, no answer used.
 * @route POST /admin/orders/:id/notes
 */
export function addOrderNote(id: Id, body: OrderNoteBody, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/orders/:id/notes', { id }), body, init);
}

/**
 * Forces the order out to its supplier now: the demo's Retry. Use it for an order stuck in the queue, or after a
 * supplier timeout once you have checked that the supplier did not run it.
 * Assumed contract: body `{}`, no answer used.
 * @route POST /admin/orders/:id/dispatch
 */
export function dispatchOrder(id: Id, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/orders/:id/dispatch', { id }), {}, init);
}

/**
 * Asks the supplier for the result now (force get). Use it first when a supplier timed out: the supplier may have
 * finished the order already.
 * Assumed contract: body `{}`, no answer used.
 * @route POST /admin/orders/:id/fetch
 */
export function fetchOrderResult(id: Id, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/orders/:id/fetch', { id }), {}, init);
}

/**
 * Changes the supplier of an order, and/or forgets the old supplier's reference: the demo's Reroute. It only changes
 * the order; sending it to the new supplier is `dispatchOrder` (the console calls both, MISMATCHES M26).
 * Assumed contract: body `{ supplierId?, resetReference? }`, no answer used.
 * @route POST /admin/orders/:id/change-supplier
 */
export function changeOrderSupplier(id: Id, body: ChangeSupplierBody, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/orders/:id/change-supplier', { id }), body, init);
}
