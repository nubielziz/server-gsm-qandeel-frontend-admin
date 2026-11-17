// Payment gateways (`/admin/payment-gateways*`): the cards of the Payment methods tab. The map gives no bodies (MISMATCHES M10), so
// shapes are assumed contracts. Every call needs `payments:gateways`. The catalog of ready-made methods and the logo routes are a backend
// addition (B232, MISMATCHES M266).
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
import type { CreateGatewayBody, GatewayPreset, PaymentGateway, UpdateGatewayBody } from '../types';

/**
 * The payment gateways with their fees, limits and the merchant groups that may use them.
 * Rows never carry a secret, only the hints `secretHint`, `webhookSecretHint` and `secondaryWebhookSecretHint`.
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
 * Body `CreateGatewayBody` (with the optional write-only `webhookSecret` and `secondaryWebhookSecret`), answer the new gateway.
 * A method made from the catalog sends `preset` (backend addition, B232): the server answers 422 on `preset` for a key it does not know
 * or cannot add yet, and on `isManual` or `driver` when they differ from the preset's.
 * @route POST /admin/payment-gateways
 */
export function createGateway(body: CreateGatewayBody, init?: ApiInit): Promise<PaymentGateway> {
  return apiPost<PaymentGateway>('/admin/payment-gateways', body, init);
}

/**
 * Changes a gateway; only the fields that change are sent. The on/off switch sends `{ isActive }`. A new `secret` replaces the stored one;
 * a new `webhookSecret` replaces the first webhook secret and keeps the second; `secondaryWebhookSecret` sets the second, `null` removes it.
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

/**
 * The catalog of ready-made payment methods, in the order to show them: a key, a name, manual or automatic, whether it can be added yet,
 * the driver, the top-up word and the instructions template. A small fixed list (a plain array, no total).
 * Backend addition, B232 (MISMATCHES M266); assumed contract: the shape of plan section 5.
 * @route GET /admin/payment-gateway-presets
 */
export function listGatewayPresets(init?: ApiInit): Promise<GatewayPreset[]> {
  return apiGet<GatewayPreset[]>('/admin/payment-gateway-presets', undefined, init);
}

/**
 * Uploads the logo of a payment method. `body` is multipart form data with one part named `file` (a JPEG, PNG or WebP, at most 2 MiB);
 * the answer is the gateway with its new `logoUrl`. The server answers 422 on `file` for a wrong or unreadable picture, 413 over 2 MiB,
 * 415 for a body it does not read, and 404 for an unknown gateway.
 * Backend addition, B232 (MISMATCHES M266).
 * @route POST /admin/payment-gateways/:id/logo
 */
export function uploadGatewayLogo(id: Id, body: FormData, init?: ApiInit): Promise<PaymentGateway> {
  return apiPost<PaymentGateway>(pathOf('/admin/payment-gateways/:id/logo', { id }), body, init);
}

/**
 * Removes the uploaded logo of a payment method. Answers 204 also when there was none; the method then shows the logo of its preset, or an icon.
 * Backend addition, B232 (MISMATCHES M266).
 * @route DELETE /admin/payment-gateways/:id/logo
 */
export function removeGatewayLogo(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/payment-gateways/:id/logo', { id }), undefined, init);
}
