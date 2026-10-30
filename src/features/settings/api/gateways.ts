// Payment gateways (`/admin/payment-gateways*`): the cards of the Payment methods tab. The map gives no bodies (MISMATCHES M10), so
// shapes are assumed contracts. Every call needs `payments:gateways`.
import {
  apiDelete,
  apiGet,
  apiList,
  apiPatch,
  apiPost,
  pathOf,
  type ApiInit,
  type Id,
  type ListQuery,
  type ListResult,
} from '@/lib/api';
import type { CreateGatewayBody, PaymentGateway, UpdateGatewayBody } from '../types';

/**
 * The payment gateways with their fees, limits and the merchant groups that may use them.
 * Assumed contract: rows never carry a secret, only `secretHint`.
 * @route GET /admin/payment-gateways
 */
export function listGateways(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<PaymentGateway>> {
  return apiList<PaymentGateway>('/admin/payment-gateways', query, undefined, init);
}

/**
 * One gateway.
 * Assumed contract: same fields as a list row.
 * @route GET /admin/payment-gateways/:id
 */
export function getGateway(id: Id, init?: ApiInit): Promise<PaymentGateway> {
  return apiGet<PaymentGateway>(pathOf('/admin/payment-gateways/:id', { id }), undefined, init);
}

/**
 * Connects a new payment method. The secret (API key) is write-only: the server keeps it and never sends it back.
 * Assumed contract: body `CreateGatewayBody`, answer the new gateway.
 * @route POST /admin/payment-gateways
 */
export function createGateway(body: CreateGatewayBody, init?: ApiInit): Promise<PaymentGateway> {
  return apiPost<PaymentGateway>('/admin/payment-gateways', body, init);
}

/**
 * Changes a gateway; only the fields that change are sent. The on/off switch sends `{ isActive }`. A new `secret` replaces the stored one.
 * Assumed contract: answer the updated gateway.
 * @route PATCH /admin/payment-gateways/:id
 */
export function updateGateway(id: Id, body: UpdateGatewayBody, init?: ApiInit): Promise<PaymentGateway> {
  return apiPatch<PaymentGateway>(pathOf('/admin/payment-gateways/:id', { id }), body, init);
}

/**
 * Removes a gateway. The server refuses (409) one that payments still use; the dialog shows its message.
 * Assumed contract: no body, answer 204.
 * @route DELETE /admin/payment-gateways/:id
 */
export function deleteGateway(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/payment-gateways/:id', { id }), undefined, init);
}
