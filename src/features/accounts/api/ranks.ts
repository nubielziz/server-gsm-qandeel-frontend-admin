// Rank routes (`/admin/client-groups*`): the discount and deposit limit of each rank, merchant ranks and the shop's one retail rank
//. A tab the demo lacks (it had three fixed groups, MISMATCHES M46). The map gives no bodies (MISMATCHES M10).
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
import type { CreateRankBody, Rank, UpdateRankBody } from '../types';

/**
 * The ranks, with the total in `x-total-count`. The Ranks view, the rank menus and the account forms read them whole (there are
 * few). Needs `groups:read`.
 * Assumed contract: rows carry `rankKind` (retail or merchant) and `accountCount` (every account in the rank, retail too); the
 * shop's retail rank has `kind: 'b2c_retail'`.
 * @route GET /admin/client-groups
 */
export function listRanks(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<Rank>> {
  return apiList<Rank>('/admin/client-groups', query, undefined, init);
}

/**
 * One rank.
 * Assumed contract: same shape as a list row.
 * @route GET /admin/client-groups/:id
 */
export function getRank(id: Id, init?: ApiInit): Promise<Rank> {
  return apiGet<Rank>(pathOf('/admin/client-groups/:id', { id }), undefined, init);
}

/**
 * Creates a merchant rank. A retail rank cannot allow credit. Needs `groups:create`.
 * Assumed contract: body `{ name, discountPercent, depositLimit, overdraftAllowed, isDefault }`, answer the rank.
 * @route POST /admin/client-groups
 */
export function createRank(body: CreateRankBody, init?: ApiInit): Promise<Rank> {
  return apiPost<Rank>('/admin/client-groups', body, init);
}

/**
 * Changes a rank; only the fields that change are sent. A new discount applies to the next order of every account in the rank.
 * Needs `groups:update`.
 * Assumed contract: body is a partial of the create body, answer the rank.
 * @route PATCH /admin/client-groups/:id
 */
export function updateRank(id: Id, body: UpdateRankBody, init?: ApiInit): Promise<Rank> {
  return apiPatch<Rank>(pathOf('/admin/client-groups/:id', { id }), body, init);
}

/**
 * Deletes a rank. The server refuses (409) while accounts are still in it, and always for the retail rank. Needs `groups:delete`.
 * Assumed contract: no body, answer 204.
 * @route DELETE /admin/client-groups/:id
 */
export function deleteRank(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/client-groups/:id', { id }), undefined, init);
}
