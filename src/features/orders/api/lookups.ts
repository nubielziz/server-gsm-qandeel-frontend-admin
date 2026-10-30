// The read-only supplier lookup for the list's filter menu and the reroute menu. The suppliers feature owns this route and
// will export its own typed function; this stays here without an `@route` tag until then. (Merchant names come from
// `listClients` in the merchants feature.)
import { apiList, type ApiInit, type ListResult } from '@/lib/api';
import type { SupplierOption } from '../types';

/** Most names one menu loads. A longer list would need a search box; the demo's menus were plain selects too. */
export const LOOKUP_CAP = 200;

/**
 * The suppliers (id, name, health), for the supplier filter and the Retry or reroute menu. Needs `suppliers:read`.
 * Assumed contract: rows carry `id`, `name` and `status`.
 */
export function listSupplierOptions(init?: ApiInit): Promise<ListResult<SupplierOption>> {
  return apiList<SupplierOption>('/admin/suppliers', { start: 0, end: LOOKUP_CAP }, undefined, init);
}
