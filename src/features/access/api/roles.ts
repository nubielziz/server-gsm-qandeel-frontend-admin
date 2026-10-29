// Role routes (`/admin/roles*`, `/admin/permissions`). Roles are editable records here; the demo's six fixed roles
// (ADMIN_ROLES, MISMATCHES M11) are only the mock's seed. The map gives no bodies, so every body and answer is an
// assumed contract (MISMATCHES M10).
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
import { normalisePermissions } from '../lib/permissions';
import type { CreateRoleBody, Permission, PermissionsAnswer, Role, UpdateRoleBody } from '../types';

/**
 * The roles with their permission lists (and how many staff hold each, when the server counts them).
 * Assumed contract: rows may carry `staffCount` (how many staff have the role).
 * @route GET /admin/roles
 */
export function listRoles(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<Role>> {
  return apiList<Role>('/admin/roles', query, undefined, init);
}

/**
 * One role with its permission list.
 * Assumed contract: same fields as the list.
 * @route GET /admin/roles/:id
 */
export function getRole(id: Id, init?: ApiInit): Promise<Role> {
  return apiGet<Role>(pathOf('/admin/roles/:id', { id }), undefined, init);
}

/**
 * Creates a role from a name and the permissions it grants.
 * Assumed contract: body `{ name, permissions }`, answer the new role.
 * @route POST /admin/roles
 */
export function createRole(body: CreateRoleBody, init?: ApiInit): Promise<Role> {
  return apiPost<Role>('/admin/roles', body, init);
}

/**
 * Renames a role or replaces its permission list; only the fields that change are sent. The change reaches every
 * admin who holds the role.
 * Assumed contract: body `{ name?, permissions? }`, answer the updated role.
 * @route PATCH /admin/roles/:id
 */
export function updateRole(id: Id, body: UpdateRoleBody, init?: ApiInit): Promise<Role> {
  return apiPatch<Role>(pathOf('/admin/roles/:id', { id }), body, init);
}

/**
 * Deletes a role nobody holds. The server refuses (409) while admins still have it.
 * Assumed contract: no body, answer 204.
 * @route DELETE /admin/roles/:id
 */
export function deleteRole(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/roles/:id', { id }), undefined, init);
}

/**
 * Every permission that exists, so the role dialog can offer exactly those. The answer may be plain keys
 * (`["staff:read", ...]`) or objects (`{ key, label?, group? }`); either way the result is one normalised list.
 * Assumed contract: `string[]` or `{ key, label?, group? }[]`.
 * @route GET /admin/permissions
 */
export async function listPermissions(init?: ApiInit): Promise<Permission[]> {
  return normalisePermissions(await apiGet<PermissionsAnswer>('/admin/permissions', undefined, init));
}
