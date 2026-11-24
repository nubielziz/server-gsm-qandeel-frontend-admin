// The fixed prices of an account (`/admin/client-prices*`): the price one account with a merchant rank pays for one service, which
// beats the rank price, the category rule and every discount (a retail account answers 422 `retail_rank`). Ports merPricingTab and the
// `m-override` / `m-ov-del` actions of 42-p-merchants.js. There is no show route. The map gives no bodies (MISMATCHES M10).
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
import type { AccountPrice, CreateAccountPriceBody, UpdateAccountPriceBody } from '../types';

/**
 * The fixed prices, filtered by `clientId` (the account's id) for one account's Prices part, with the total in `x-total-count`.
 * Needs `pricing:read`.
 * Assumed contract: rows carry the joined `service` (name, type, base price, floor price) and `groupPrice`, the price the account
 * would pay without the fixed price.
 * @route GET /admin/client-prices
 */
export function listAccountPrices(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<AccountPrice>> {
  return apiList<AccountPrice>('/admin/client-prices', query, undefined, init);
}

/**
 * Sets a fixed price for an account on a service. The server refuses a price below the service's floor (cost plus minimum profit)
 * with a message on the `price` field. Needs `pricing:create`.
 * Assumed contract: body `{ clientId, serviceId, price, note? }`, answer the row.
 * @route POST /admin/client-prices
 */
export function createAccountPrice(body: CreateAccountPriceBody, init?: ApiInit): Promise<AccountPrice> {
  return apiPost<AccountPrice>('/admin/client-prices', body, init);
}

/**
 * Changes the price or the note of a fixed price; only the fields that change are sent. Needs `pricing:update`.
 * Assumed contract: body `{ price?, note? }`, answer the row.
 * @route PATCH /admin/client-prices/:id
 */
export function updateAccountPrice(
  id: Id,
  body: UpdateAccountPriceBody,
  init?: ApiInit,
): Promise<AccountPrice> {
  return apiPatch<AccountPrice>(pathOf('/admin/client-prices/:id', { id }), body, init);
}

/**
 * Removes a fixed price: the account pays the rank price again from the next order. Needs `pricing:delete`.
 * Assumed contract: no body, answer 204.
 * @route DELETE /admin/client-prices/:id
 */
export function deleteAccountPrice(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/client-prices/:id', { id }), undefined, init);
}
