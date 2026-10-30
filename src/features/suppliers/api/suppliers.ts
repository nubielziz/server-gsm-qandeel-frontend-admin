// The supplier connections (`CRUD /admin/suppliers`): the list on the left of the Suppliers page and the detail on the
// right. Ports the data side of pageSuppliers in 44-p-suppliers.js. The map gives no bodies (MISMATCHES M10), so shapes
// are assumed contracts.
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
import type { CreateSupplierBody, Supplier, SupplierDetail, UpdateSupplierBody } from '../types';

/**
 * The suppliers, one page of them, with the total in `x-total-count`. The page loads them all (a company has a handful
 * of suppliers) to draw the list, the counts in the header and the target menus. `q` searches by name.
 * Assumed contract: rows carry the health figures and the open-order counts next to the table's columns.
 * @route GET /admin/suppliers
 */
export function listSuppliers(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<Supplier>> {
  return apiList<Supplier>('/admin/suppliers', query, undefined, init);
}

/**
 * One supplier with what only the detail needs: the hourly history of the last 24 hours and the services linked to it
 * with their role. Also refreshes the open detail after an action, because a list row can be a moment older.
 * Assumed contract: a list row plus `history` and `links`.
 * @route GET /admin/suppliers/:id
 */
export function getSupplier(id: Id, init?: ApiInit): Promise<SupplierDetail> {
  return apiGet<SupplierDetail>(pathOf('/admin/suppliers/:id', { id }), undefined, init);
}

/**
 * Connects a supplier: its API type, base URL, account name and API key, with the currency and the limits the console
 * keeps for it. The key is write-only; the server stores it encrypted and never sends it back.
 * Assumed contract: body `CreateSupplierBody`, answer the new supplier.
 * @route POST /admin/suppliers
 */
export function createSupplier(body: CreateSupplierBody, init?: ApiInit): Promise<SupplierDetail> {
  return apiPost<SupplierDetail>('/admin/suppliers', body, init);
}

/**
 * Changes a supplier; only the fields that change are sent. `status` switches it on or off (Disable and Enable), the other
 * fields are the connection (Edit connection…). A new `apiKey` replaces the stored one.
 * Assumed contract: body `UpdateSupplierBody`, answer the updated supplier.
 * @route PATCH /admin/suppliers/:id
 */
export function updateSupplier(id: Id, body: UpdateSupplierBody, init?: ApiInit): Promise<SupplierDetail> {
  return apiPatch<SupplierDetail>(pathOf('/admin/suppliers/:id', { id }), body, init);
}

/**
 * Deletes a supplier connection. The server refuses (409) while orders or services still depend on it; the console shows
 * its words, and Disable is the way to stop using a supplier that has history.
 * Assumed contract: no body, no answer used.
 * @route DELETE /admin/suppliers/:id
 */
export function deleteSupplier(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/suppliers/:id', { id }), undefined, init);
}
