// The supplier API log (`GET /admin/supplier-api-logs`, `GET /admin/supplier-api-logs/:id`): every request sent to a
// supplier and its answer. Ports the live API log of 44-p-suppliers.js (`logTable`, which showed fake calls added by a
// timer); here the rows are real and the page asks again every few seconds. Shapes are assumed contracts (MISMATCHES M10).
import { apiGet, apiList, pathOf, type ApiInit, type Id, type ListQuery, type ListResult } from '@/lib/api';
import type { SupplierApiLog, SupplierApiLogDetail } from '../types';

/**
 * The calls to suppliers, newest first when sorted by `createdAt` descending, with the total in `x-total-count`. The page
 * filters by `supplierId`. Rows leave out the request and response bodies, which are big.
 * Assumed contract: rows are `SupplierApiLog`.
 * @route GET /admin/supplier-api-logs
 */
export function listSupplierApiLogs(
  query: ListQuery = {},
  init?: ApiInit,
): Promise<ListResult<SupplierApiLog>> {
  return apiList<SupplierApiLog>('/admin/supplier-api-logs', query, undefined, init);
}

/**
 * One call with its request and response bodies, for the drawer a log row opens. The server has already masked the keys
 * and passwords in both bodies, so the console prints them as they are.
 * Assumed contract: a list row plus `request` and `response` (any JSON).
 * @route GET /admin/supplier-api-logs/:id
 */
export function getSupplierApiLog(id: Id, init?: ApiInit): Promise<SupplierApiLogDetail> {
  return apiGet<SupplierApiLogDetail>(pathOf('/admin/supplier-api-logs/:id', { id }), undefined, init);
}
