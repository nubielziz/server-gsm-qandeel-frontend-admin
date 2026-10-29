// Two read-only lookups for the list's filter menus and the reroute menu: the suppliers and the merchants by name.
// The suppliers and merchants features own these routes and will export their own typed functions; these stay here
// without an `@route` tag so the route coverage count is not claimed twice. Replace them with those functions then.
import { apiList, type ApiInit, type ListResult } from '@/lib/api';
import type { ClientOption, SupplierOption } from '../types';

/** Most names one menu loads. A longer list would need a search box; the demo's menus were plain selects too. */
export const LOOKUP_CAP = 200;

/**
 * The suppliers (id, name, health), for the supplier filter and the Retry or reroute menu. Needs `suppliers:read`.
 * Assumed contract: rows carry `id`, `name` and `status`.
 */
export function listSupplierOptions(init?: ApiInit): Promise<ListResult<SupplierOption>> {
  return apiList<SupplierOption>('/admin/suppliers', { start: 0, end: LOOKUP_CAP }, undefined, init);
}

/**
 * The merchants (id, name), for the merchant filter. Needs `clients:read`.
 * Assumed contract: rows carry `id` and `name`.
 */
export function listClientOptions(init?: ApiInit): Promise<ListResult<ClientOption>> {
  return apiList<ClientOption>(
    '/admin/clients',
    { start: 0, end: LOOKUP_CAP, sort: ['name'], order: ['asc'] },
    undefined,
    init,
  );
}
