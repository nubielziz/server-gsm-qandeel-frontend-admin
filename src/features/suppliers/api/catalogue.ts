// A supplier's own service list and the import of services from it (`/admin/suppliers/:id/services` and
// `/admin/suppliers/:id/import*`). The demo has no import screen (its empty state only says "Import its catalog"), so
// this is built in the demo's dialog style. The map gives no bodies (MISMATCHES M10): shapes are assumed contracts.
import { apiList, apiPost, pathOf, type ApiInit, type Id, type ListQuery, type ListResult } from '@/lib/api';
import type { ImportBody, ImportPreview, ImportResult, SupplierService } from '../types';

/**
 * The supplier's services as the last sync saw them, one page of them with the total in `x-total-count`. `q` searches by
 * name, and the filter `imported` (true or false) narrows to what is already in the console or not. A supplier can have
 * thousands of services, so the console always asks for a page.
 * Assumed contract: rows are `SupplierService`.
 * @route GET /admin/suppliers/:id/services
 */
export function listSupplierServices(
  id: Id,
  query: ListQuery = {},
  init?: ApiInit,
): Promise<ListResult<SupplierService>> {
  return apiList<SupplierService>(pathOf('/admin/suppliers/:id/services', { id }), query, undefined, init);
}

/**
 * Shows what an import would do with the picked supplier services: which are new, which match a service already in the
 * console, and which changed their cost, with the price the server suggests for a new one. Changes nothing.
 * Assumed contract: body `{ supplierServiceIds }`, answer `{ items }`.
 * @route POST /admin/suppliers/:id/import/preview
 */
export function previewImport(id: Id, body: ImportBody, init?: ApiInit): Promise<ImportPreview> {
  return apiPost<ImportPreview>(pathOf('/admin/suppliers/:id/import/preview', { id }), body, init);
}

/**
 * Imports the picked supplier services as services of the console, with their fields and a link to the supplier. The
 * server decides prices and what to skip; the answer counts what it did.
 * Assumed contract: body `{ supplierServiceIds }`, answer `{ created, updated, unchanged }`.
 * @route POST /admin/suppliers/:id/import
 */
export function importServices(id: Id, body: ImportBody, init?: ApiInit): Promise<ImportResult> {
  return apiPost<ImportResult>(pathOf('/admin/suppliers/:id/import', { id }), body, init);
}
