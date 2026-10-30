// Currencies and exchange rates (`/admin/currencies*`): the Currencies table and the "Refresh rates" action. The map gives no
// bodies (MISMATCHES M10), so shapes are assumed contracts. The currency routes need `settings:update`, the refresh `currencies:update`.
import {
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
import type { CreateCurrencyBody, Currency, RefreshFxResult, UpdateCurrencyBody } from '../types';

/**
 * The currencies with their rate, markup, the time the rate was updated and whether customers are offered it.
 * @route GET /admin/currencies
 */
export function listCurrencies(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<Currency>> {
  return apiList<Currency>('/admin/currencies', query, undefined, init);
}

/**
 * One currency.
 * Assumed contract: same fields as a list row.
 * @route GET /admin/currencies/:id
 */
export function getCurrency(id: Id, init?: ApiInit): Promise<Currency> {
  return apiGet<Currency>(pathOf('/admin/currencies/:id', { id }), undefined, init);
}

/**
 * Adds a currency to the list. Assumed contract: body `CreateCurrencyBody`, answer the new currency.
 * @route POST /admin/currencies
 */
export function createCurrency(body: CreateCurrencyBody, init?: ApiInit): Promise<Currency> {
  return apiPost<Currency>('/admin/currencies', body, init);
}

/**
 * Changes a currency; only the fields that change are sent. The "Offered" switch sends `{ isStorefront }`, the edit dialog the
 * rate, markup and rounding. Assumed contract: answer the updated currency.
 * @route PATCH /admin/currencies/:id
 */
export function updateCurrency(id: Id, body: UpdateCurrencyBody, init?: ApiInit): Promise<Currency> {
  return apiPatch<Currency>(pathOf('/admin/currencies/:id', { id }), body, init);
}

/**
 * Asks the server to fetch fresh exchange rates for the currencies shown to customers. The server decides which ones, writes
 * the audit log and says what it changed and what it could not. Needs `currencies:update`.
 * Assumed contract: no body, answer `RefreshFxResult`.
 * @route POST /admin/currencies/refresh-fx
 */
export function refreshFx(init?: ApiInit): Promise<RefreshFxResult> {
  return apiPost<RefreshFxResult>('/admin/currencies/refresh-fx', undefined, init);
}
