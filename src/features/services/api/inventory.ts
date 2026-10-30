// The code inventory (`GET /admin/inventory-codes`, import and void): the Code inventory tab the map adds to the demo's
// Services & pricing page. The map gives no bodies (MISMATCHES M10), so shapes are assumed contracts.
import { apiList, apiPost, pathOf, type ApiInit, type Id, type ListQuery, type ListResult } from '@/lib/api';
import type {
  ImportCodesBody,
  ImportCodesResult,
  InventoryCode,
  VoidCodesBody,
  VoidCodesResult,
} from '../types';

/**
 * The stock of digital codes and the status of each. Filters: `serviceId` and `status`; sort with `_sort`/`_order`.
 * The codes are masked by the server: only the last four characters show.
 * Assumed contract: rows carry `maskedCode` and the service as an `{ id, name }` join.
 * @route GET /admin/inventory-codes
 */
export function listInventoryCodes(
  query: ListQuery = {},
  init?: ApiInit,
): Promise<ListResult<InventoryCode>> {
  return apiList<InventoryCode>('/admin/inventory-codes', query, undefined, init);
}

/**
 * Adds codes to one service's stock. The server counts what it imported, what it already had (duplicates) and what it
 * could not read (rejected); the dialog shows those counts.
 * Assumed contract: body `{ codes, batchRef? }`, answer `{ imported, duplicates, rejected, batchRef? }`.
 * @route POST /admin/services/:id/inventory/import
 */
export function importInventoryCodes(
  serviceId: Id,
  body: ImportCodesBody,
  init?: ApiInit,
): Promise<ImportCodesResult> {
  return apiPost<ImportCodesResult>(
    pathOf('/admin/services/:id/inventory/import', { id: serviceId }),
    body,
    init,
  );
}

/**
 * Takes unsold codes out of stock for good. The server skips codes that are not unsold and says how many.
 * Assumed contract: body `{ ids }`, answer `{ voided, skipped }`.
 * @route POST /admin/inventory-codes/void
 */
export function voidInventoryCodes(body: VoidCodesBody, init?: ApiInit): Promise<VoidCodesResult> {
  return apiPost<VoidCodesResult>('/admin/inventory-codes/void', body, init);
}
