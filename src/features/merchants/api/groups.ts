// Merchant group routes (`/admin/client-groups*`): the discount, upgrade threshold and deposit limit of each price group. A tab
// the demo lacks (it had three fixed groups, MISMATCHES M46). The map gives no bodies (MISMATCHES M10), so shapes are assumed.
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
import type { ClientGroup, CreateClientGroupBody, UpdateClientGroupBody } from '../types';

/**
 * The merchant groups, with the total in `x-total-count`. The Groups tab, the group menus and the invite dialog read it
 * whole (there are few). Needs `groups:read`.
 * Assumed contract: rows may carry `merchantCount` (how many merchants are in the group); the storefront's retail
 * group has `kind: 'b2c_retail'`.
 * @route GET /admin/client-groups
 */
export function listClientGroups(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<ClientGroup>> {
  return apiList<ClientGroup>('/admin/client-groups', query, undefined, init);
}

/**
 * One group.
 * Assumed contract: same shape as a list row.
 * @route GET /admin/client-groups/:id
 */
export function getClientGroup(id: Id, init?: ApiInit): Promise<ClientGroup> {
  return apiGet<ClientGroup>(pathOf('/admin/client-groups/:id', { id }), undefined, init);
}

/**
 * Creates a merchant group. Needs `groups:create`.
 * Assumed contract: body `{ name, discountPercent, earnThreshold, depositLimit, overdraftAllowed, isDefault }`, answer the group.
 * @route POST /admin/client-groups
 */
export function createClientGroup(body: CreateClientGroupBody, init?: ApiInit): Promise<ClientGroup> {
  return apiPost<ClientGroup>('/admin/client-groups', body, init);
}

/**
 * Changes a group; only the fields that change are sent. A new discount applies to the next order of every merchant in
 * the group. Needs `groups:update`.
 * Assumed contract: body is a partial of the create body, answer the group.
 * @route PATCH /admin/client-groups/:id
 */
export function updateClientGroup(id: Id, body: UpdateClientGroupBody, init?: ApiInit): Promise<ClientGroup> {
  return apiPatch<ClientGroup>(pathOf('/admin/client-groups/:id', { id }), body, init);
}

/**
 * Deletes a group. The server refuses (409) while merchants are still in it. Needs `groups:delete`.
 * Assumed contract: no body, answer 204.
 * @route DELETE /admin/client-groups/:id
 */
export function deleteClientGroup(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/client-groups/:id', { id }), undefined, init);
}
