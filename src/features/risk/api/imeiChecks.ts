// The IMEI check log (`GET /admin/imei-checks`, `GET /admin/imei-checks/:id`). Ports the data side of `tabChecks` in
// 54-p-risk.js. The server erases or hashes IMEIs after the retention period; whatever it sends is what the screen shows.
import { apiGet, apiList, pathOf, type ApiInit, type Id, type ListQuery, type ListResult } from '@/lib/api';
import type { ImeiCheck } from '../types';

/**
 * One page of the checks, newest first by default, with the total in `x-total-count`. Filters are field filters
 * (`checkType`, `status`, `source`, see `ImeiCheckFilters`) plus `q`, which searches the IMEI, brand and model; sort with
 * `_sort`/`_order`. The figures above the table are this call with `_start=0&_end=1`.
 * Assumed contract: rows are `ImeiCheck`.
 * @route GET /admin/imei-checks
 */
export function listImeiChecks(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<ImeiCheck>> {
  return apiList<ImeiCheck>('/admin/imei-checks', query, undefined, init);
}

/**
 * One check, for the details drawer when it is opened from a link that has no list row.
 * Assumed contract: same shape as a list row.
 * @route GET /admin/imei-checks/:id
 */
export function getImeiCheck(id: Id, init?: ApiInit): Promise<ImeiCheck> {
  return apiGet<ImeiCheck>(pathOf('/admin/imei-checks/:id', { id }), undefined, init);
}
