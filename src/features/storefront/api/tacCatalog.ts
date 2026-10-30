// The TAC catalogue (`/admin/tac-catalog*`): the TAC catalogue tab, which the map adds to the demo's Storefront page (the
// demo kept the table inside its IMEI checker). The map gives no bodies (MISMATCHES M10), so shapes are assumed contracts.
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
import type { CreateTacBody, TacEntry, UpdateTacBody } from '../types';

/**
 * The TAC entries, one page of them. Filters: `q` (prefix, brand or model) and `brand`; sort with `_sort`/`_order` on
 * `tac`, `brand`, `model` or `releaseYear`.
 * @route GET /admin/tac-catalog
 */
export function listTacEntries(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<TacEntry>> {
  return apiList<TacEntry>('/admin/tac-catalog', query, undefined, init);
}

/**
 * One entry.
 * Assumed contract: same fields as a list row.
 * @route GET /admin/tac-catalog/:id
 */
export function getTacEntry(id: Id, init?: ApiInit): Promise<TacEntry> {
  return apiGet<TacEntry>(pathOf('/admin/tac-catalog/:id', { id }), undefined, init);
}

/**
 * Adds a TAC (the first 8 digits of an IMEI) with its brand and model. The server refuses a prefix that is already there.
 * Assumed contract: body `{ tac, brand, model, marketingName?, releaseYear? }`, answer the new entry.
 * @route POST /admin/tac-catalog
 */
export function createTacEntry(body: CreateTacBody, init?: ApiInit): Promise<TacEntry> {
  return apiPost<TacEntry>('/admin/tac-catalog', body, init);
}

/**
 * Corrects an entry; only the fields that change are sent.
 * Assumed contract: body is any of the fields of `UpdateTacBody`, answer the updated entry.
 * @route PATCH /admin/tac-catalog/:id
 */
export function updateTacEntry(id: Id, body: UpdateTacBody, init?: ApiInit): Promise<TacEntry> {
  return apiPatch<TacEntry>(pathOf('/admin/tac-catalog/:id', { id }), body, init);
}
