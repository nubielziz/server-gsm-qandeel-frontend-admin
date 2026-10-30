// The review queue and its two decisions (`GET /admin/risk/queue`, `POST /admin/risk/orders/:id/approve|refund`). Ports the
// data side of `tabQueue` and the `rk-approve` / `rk-refund` actions of 54-p-risk.js. The map gives routes and permissions but
// no bodies (MISMATCHES M10), so the shapes are assumed contracts.
import { apiGet, apiPost, pathOf, type ApiInit, type Id } from '@/lib/api';
import type { RefundHeldBody, RiskQueue } from '../types';

/**
 * The paid storefront orders the rules are holding, with the figures and the latest decisions the strip and the "Decided
 * recently" list show. The server scored them; the console only lists them.
 * Assumed contract: `{ held, stats?, recent? }` (see `RiskQueue`).
 * @route GET /admin/risk/queue
 */
export function getRiskQueue(init?: ApiInit): Promise<RiskQueue> {
  return apiGet<RiskQueue>('/admin/risk/queue', undefined, init);
}

/**
 * Approves a held order: the server sends it to the supplier and records who decided. The customer is told by email.
 * Assumed contract: no request body; the answer is not used.
 * @route POST /admin/risk/orders/:id/approve
 */
export function approveHeldOrder(orderId: Id, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/risk/orders/:id/approve', { id: orderId }), undefined, init);
}

/**
 * Refunds a held order (the supplier is never contacted) and, when asked, adds the customer's email and/or the device to the
 * blocklist. The reason goes to the audit log and to the blocklist entries.
 * Assumed contract: body `{ reason?, blockEmail?, blockDevice? }`; the answer is not used.
 * @route POST /admin/risk/orders/:id/refund
 */
export function refundHeldOrder(orderId: Id, body: RefundHeldBody, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/risk/orders/:id/refund', { id: orderId }), body, init);
}
