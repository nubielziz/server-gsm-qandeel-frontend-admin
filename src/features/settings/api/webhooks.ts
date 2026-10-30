// The log of merchant webhooks (`/admin/webhook-deliveries*`): the Webhook deliveries tab, a tab the demo lacks. Reading needs
// `webhooks:read`, the retry `webhooks:update`. The map gives no bodies (MISMATCHES M10), so shapes are assumed contracts.
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
import type { WebhookDelivery, WebhookDeliveryDetail } from '../types';

/**
 * The webhook attempts to merchants, newest first with `_sort=createdAt&_order=desc`. Filters: `status`, `event`, `clientId`; `q` searches
 * the merchant, event and address.
 * Assumed contract: rows carry the joins `endpoint` and `client`.
 * @route GET /admin/webhook-deliveries
 */
export function listWebhookDeliveries(
  query: ListQuery = {},
  init?: ApiInit,
): Promise<ListResult<WebhookDelivery>> {
  return apiList<WebhookDelivery>('/admin/webhook-deliveries', query, undefined, init);
}

/**
 * One delivery with the request that was sent (`payload`) and the merchant's answer (`responseBody`, `error`).
 * Assumed contract: a list row plus those two fields.
 * @route GET /admin/webhook-deliveries/:id
 */
export function getWebhookDelivery(id: Id, init?: ApiInit): Promise<WebhookDeliveryDetail> {
  return apiGet<WebhookDeliveryDetail>(pathOf('/admin/webhook-deliveries/:id', { id }), undefined, init);
}

/**
 * Sends a delivery again. The server queues a new attempt (the merchant may still refuse it) and refuses one that already
 * worked (409), which the drawer shows.
 * Assumed contract: no body, answer the delivery after queuing.
 * @route POST /admin/webhook-deliveries/:id/retry
 */
export function retryWebhookDelivery(id: Id, init?: ApiInit): Promise<WebhookDelivery> {
  return apiPost<WebhookDelivery>(pathOf('/admin/webhook-deliveries/:id/retry', { id }), undefined, init);
}
