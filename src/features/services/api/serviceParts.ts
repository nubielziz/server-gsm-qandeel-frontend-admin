// The parts of a service that are replaced as a whole list: custom fields, option lists and group prices
// (`PUT /admin/services/:id/*`). Ports the "Group prices", "Fields" and "Options" row actions the map adds to the demo's menu.
// The map gives no bodies (MISMATCHES M10), so shapes are assumed contracts.
import { apiPut, pathOf, type ApiInit, type Id } from '@/lib/api';
import type {
  ReplaceFieldsBody,
  ReplaceGroupPricesBody,
  ReplaceOptionsBody,
  ServiceField,
  ServiceGroupPrice,
  ServiceOption,
} from '../types';

/**
 * Replaces the custom fields a buyer fills in for this service. The list is saved as sent, in order: a field left out
 * is removed.
 * Assumed contract: body `{ fields }`, answer the saved fields.
 * @route PUT /admin/services/:id/fields
 */
export function replaceServiceFields(
  id: Id,
  body: ReplaceFieldsBody,
  init?: ApiInit,
): Promise<ServiceField[]> {
  return apiPut<ServiceField[]>(pathOf('/admin/services/:id/fields', { id }), body, init);
}

/**
 * Replaces the model, network and MEP lists of this service. All three lists go together; an entry left out is removed.
 * Assumed contract: body `{ options }`, answer the saved options.
 * @route PUT /admin/services/:id/options
 */
export function replaceServiceOptions(
  id: Id,
  body: ReplaceOptionsBody,
  init?: ApiInit,
): Promise<ServiceOption[]> {
  return apiPut<ServiceOption[]>(pathOf('/admin/services/:id/options', { id }), body, init);
}

/**
 * Replaces the fixed prices of this service per merchant group. A group left out pays the base price less its discount.
 * Assumed contract: body `{ prices }`, answer the saved prices.
 * @route PUT /admin/services/:id/group-prices
 */
export function replaceServiceGroupPrices(
  id: Id,
  body: ReplaceGroupPricesBody,
  init?: ApiInit,
): Promise<ServiceGroupPrice[]> {
  return apiPut<ServiceGroupPrice[]>(pathOf('/admin/services/:id/group-prices', { id }), body, init);
}
