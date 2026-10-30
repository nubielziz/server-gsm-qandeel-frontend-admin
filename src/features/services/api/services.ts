// The services of the catalog (`/admin/services*`): list, read, create, change and delete. Ports the data side of pageServices
// in 43-p-services.js and the setters of 11-state.js (`setServiceField`, `setPrice`). The map gives no bodies (MISMATCHES M10),
// so shapes are assumed contracts.
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
import type { CreateServiceBody, Service, ServiceDetail, UpdateServiceBody } from '../types';

/**
 * The services, one page of them, with the total in `x-total-count`. Filters: `q` (name, code or category), `type`,
 * `status`, `belowFloor` and `categoryId`; sort with `_sort`/`_order` on `name`, `type`, `cost` or `basePrice`. The
 * counts above the table are this call with `_start=0&_end=1`, read from the total.
 * Assumed contract: rows carry the figures the server works out (`floorPrice`, `marginPct`, `belowFloor`, `costChangedFrom`),
 * `code`, `slaMinutes`, `executionMode`, and the category and suppliers as `{ id, name }` joins.
 * @route GET /admin/services
 */
export function listServices(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<Service>> {
  return apiList<Service>('/admin/services', query, undefined, init);
}

/**
 * One service with the parts its editing dialogs start from: custom fields, option lists and group prices. No other
 * route reads them, which is why this one is assumed to embed them.
 * Assumed contract: the list row plus `fields`, `options` and `groupPrices`.
 * @route GET /admin/services/:id
 */
export function getService(id: Id, init?: ApiInit): Promise<ServiceDetail> {
  return apiGet<ServiceDetail>(pathOf('/admin/services/:id', { id }), undefined, init);
}

/**
 * Creates a service. The price figures come back worked out by the server. Supplier links are made on the Suppliers page.
 * Assumed contract: body `{ name, code, categoryId, type, slaMinutes, basePrice }`, answer the new service.
 * @route POST /admin/services
 */
export function createService(body: CreateServiceBody, init?: ApiInit): Promise<Service> {
  return apiPost<Service>('/admin/services', body, init);
}

/**
 * Changes some fields of a service: the Enabled and Auto switches (`status`, `executionMode`), the price dialog
 * (`basePrice`, `minProfit`) and the edit dialog. Only the fields that change are sent. The answer has the floor and
 * the margin as the server now works them out.
 * Assumed contract: body is any of the fields of `UpdateServiceBody`, answer the updated service.
 * @route PATCH /admin/services/:id
 */
export function updateService(id: Id, body: UpdateServiceBody, init?: ApiInit): Promise<Service> {
  return apiPatch<Service>(pathOf('/admin/services/:id', { id }), body, init);
}

/**
 * Deletes a service. The server refuses (409) a service it still needs, for example one with orders; the dialog
 * shows why.
 * Assumed contract: no body, answer 204.
 * @route DELETE /admin/services/:id
 */
export function deleteService(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/services/:id', { id }), undefined, init);
}
