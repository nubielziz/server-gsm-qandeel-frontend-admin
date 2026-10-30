// Types for the merchant webhook log (`/admin/webhook-deliveries`). Assumed contracts built from `WebhookDeliveryRow`.
import type { Id, JsonValue } from '@/lib/api';
import type { WebhookDeliveryRow } from '@/lib/api/schema.gen';

/** `delivered`: the merchant answered 2xx. `failed`: the last attempt failed. `pending`: waiting for the next attempt (assumed values). */
export type DeliveryStatus = 'delivered' | 'failed' | 'pending';

/**
 * One delivery as `GET /admin/webhook-deliveries` sends it. Assumed contract: the server joins the merchant's endpoint
 * (`endpoint.url`) and the merchant (`client`), which the table needs; either may be null if the merchant was removed.
 */
export type WebhookDelivery = Omit<WebhookDeliveryRow, 'status' | 'payload'> & {
  status: DeliveryStatus;
  payload?: JsonValue;
  endpoint: { id: Id; url: string } | null;
  client: { id: Id; name: string } | null;
};

/**
 * One delivery with the merchant's answer (assumed contract of `GET /admin/webhook-deliveries/:id`): the response body the
 * merchant's server sent back, and the network error when no answer came.
 */
export type WebhookDeliveryDetail = WebhookDelivery & {
  responseBody?: string | null;
  error?: string | null;
};
