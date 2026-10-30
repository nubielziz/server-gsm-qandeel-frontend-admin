// Tax rates (`/admin/tax-rates*`): the "Tax by country" table. The map offers list, show, create and update (no delete: a rate
// that stops applying gets an end date). Bodies are assumed contracts (MISMATCHES M10). Needs `tax:read`, `tax:create`, `tax:update`.
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
import type { CreateTaxRateBody, TaxRate, UpdateTaxRateBody } from '../types';

/**
 * The tax rates by country and the date each one applies from (and until).
 * @route GET /admin/tax-rates
 */
export function listTaxRates(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<TaxRate>> {
  return apiList<TaxRate>('/admin/tax-rates', query, undefined, init);
}

/**
 * One tax rate.
 * Assumed contract: same fields as a list row.
 * @route GET /admin/tax-rates/:id
 */
export function getTaxRate(id: Id, init?: ApiInit): Promise<TaxRate> {
  return apiGet<TaxRate>(pathOf('/admin/tax-rates/:id', { id }), undefined, init);
}

/**
 * Adds a rate for a country from a date. Assumed contract: body `CreateTaxRateBody`, answer the new rate.
 * @route POST /admin/tax-rates
 */
export function createTaxRate(body: CreateTaxRateBody, init?: ApiInit): Promise<TaxRate> {
  return apiPost<TaxRate>('/admin/tax-rates', body, init);
}

/**
 * Changes a rate; only the fields that change are sent. Assumed contract: answer the updated rate.
 * @route PATCH /admin/tax-rates/:id
 */
export function updateTaxRate(id: Id, body: UpdateTaxRateBody, init?: ApiInit): Promise<TaxRate> {
  return apiPatch<TaxRate>(pathOf('/admin/tax-rates/:id', { id }), body, init);
}
