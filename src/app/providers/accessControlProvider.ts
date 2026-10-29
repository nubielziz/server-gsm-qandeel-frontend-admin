// Refine access-control provider (decision 006): answers "may the signed-in staff member do this?" from the
// permissions in `me`. The answer only drives what the UI shows; the server still enforces every permission.
import type { AccessControlProvider, CanParams } from '@refinedev/core';
import { crudPermission, hasPermission } from '@/lib/auth/permissions';
import { meCache as appMeCache, type MeCache } from './meCache';

// The permission a resource page declares in its meta (e.g. `orders:read` or `staff:*`), as one string or any-of.
function rowPermission(params: CanParams['params']): string | string[] | undefined {
  const permission = params?.resource?.meta?.permission as unknown;
  if (typeof permission === 'string') return permission;
  return Array.isArray(permission) ? permission.filter((p): p is string => typeof p === 'string') : undefined;
}

/**
 * Works out the permission a `can` call needs. An `action` with a colon (`staff:suspend`) is the permission itself;
 * otherwise it is a CRUD action (`list`, `edit`…) on a resource whose meta names the permission.
 * Returns undefined when the call names no permission at all.
 */
export function requiredPermission(request: CanParams): string | string[] | undefined {
  if (request.action.includes(':')) return request.action;
  const row = rowPermission(request.params);
  if (row === undefined) return undefined;
  return typeof row === 'string'
    ? crudPermission(row, request.action)
    : row.map((p) => crudPermission(p, request.action));
}

/** Builds the provider around a `me` cache, so tests can use their own. */
export function createAccessControlProvider(cache: MeCache = appMeCache): AccessControlProvider {
  return {
    can: async (request) => {
      const required = requiredPermission(request);
      // Nothing to check: the resource declared no permission, so the UI stays open and the server decides.
      if (required === undefined) return { can: true };
      // A failed `me` is thrown, not answered with `can: false`: React Query then keeps the last good answer (an open
      // page is not swapped for a false "no access" screen after a network blip) and the page gate can offer a retry.
      // A session-ending failure (401…) is handled by the auth provider, which signs the user out.
      const permissions = (await cache.get()).permissions;
      if (hasPermission(permissions, required)) return { can: true };
      const needed = typeof required === 'string' ? required : required.join(' or ');
      return { can: false, reason: `You need the ${needed} permission` };
    },
  };
}

export const accessControlProvider: AccessControlProvider = createAccessControlProvider();
