// Data-subject requests (`/admin/data-requests`): the export and erasure requests customers make, with their legal
// deadline. New in the console (the demo only listed a customer's requests on its Consents tab). Needs `customers:privacy`.
import {
  apiGet,
  apiList,
  apiPatch,
  pathOf,
  type ApiInit,
  type Id,
  type ListQuery,
  type ListResult,
} from '@/lib/api';
import type { DataRequest, UpdateDataRequestBody } from '../types';

/**
 * The data requests, one page of them, with the total in `x-total-count`. Filters: `status` (an array repeats the key),
 * `kind` and `customerId`; sort with `_sort`/`_order` (`requestedAt`, `dueAt`, `status`).
 * Assumed contract: rows carry the customer's name as `customerName`.
 * @route GET /admin/data-requests
 */
export function listDataRequests(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<DataRequest>> {
  return apiList<DataRequest>('/admin/data-requests', query, undefined, init);
}

/**
 * One data request, to refresh a row after a change.
 * Assumed contract: same shape as a list row.
 * @route GET /admin/data-requests/:id
 */
export function getDataRequest(id: Id, init?: ApiInit): Promise<DataRequest> {
  return apiGet<DataRequest>(pathOf('/admin/data-requests/:id', { id }), undefined, init);
}

/**
 * Moves a request along: in progress, completed or rejected, with a note for the audit log (a rejection should say why).
 * Assumed contract: body `{ status, note? }`, answer the updated request.
 * @route PATCH /admin/data-requests/:id
 */
export function updateDataRequest(id: Id, body: UpdateDataRequestBody, init?: ApiInit): Promise<DataRequest> {
  return apiPatch<DataRequest>(pathOf('/admin/data-requests/:id', { id }), body, init);
}
