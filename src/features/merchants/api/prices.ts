// Client price routes (`/admin/client-prices*`): the fixed price one merchant pays for one service, which beats the group price,
// the category rule and every discount. Ports merPricingTab and the `m-override` / `m-ov-del` actions of 42-p-merchants.js.
// There is no show route. The map gives no bodies (MISMATCHES M10), so shapes are assumed contracts.
import {
  apiDelete,
  apiList,
  apiPatch,
  apiPost,
  pathOf,
  type ApiInit,
  type Id,
  type ListQuery,
  type ListResult,
} from '@/lib/api';
import type { ClientPrice, CreateClientPriceBody, UpdateClientPriceBody } from '../types';

/**
 * The fixed prices, filtered by `clientId` for one merchant's Pricing tab, with the total in `x-total-count`. Needs `pricing:read`.
 * Assumed contract: rows carry the joined `service` (name, type, base price, floor price) and `groupPrice`, the price the
 * merchant would pay without the override.
 * @route GET /admin/client-prices
 */
export function listClientPrices(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<ClientPrice>> {
  return apiList<ClientPrice>('/admin/client-prices', query, undefined, init);
}

/**
 * Sets a fixed price for a merchant on a service. The server refuses a price below the service's floor (cost plus
 * minimum profit) with a message on the `price` field. Needs `pricing:create`.
 * Assumed contract: body `{ clientId, serviceId, price, note? }`, answer the row.
 * @route POST /admin/client-prices
 */
export function createClientPrice(body: CreateClientPriceBody, init?: ApiInit): Promise<ClientPrice> {
  return apiPost<ClientPrice>('/admin/client-prices', body, init);
}

/**
 * Changes the price or the note of a fixed price; only the fields that change are sent. Needs `pricing:update`.
 * Assumed contract: body `{ price?, note? }`, answer the row.
 * @route PATCH /admin/client-prices/:id
 */
export function updateClientPrice(id: Id, body: UpdateClientPriceBody, init?: ApiInit): Promise<ClientPrice> {
  return apiPatch<ClientPrice>(pathOf('/admin/client-prices/:id', { id }), body, init);
}

/**
 * Removes a fixed price: the merchant pays the group price again from the next order. Needs `pricing:delete`.
 * Assumed contract: no body, answer 204.
 * @route DELETE /admin/client-prices/:id
 */
export function deleteClientPrice(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/client-prices/:id', { id }), undefined, init);
}
