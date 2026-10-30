// Two read-only lookups for the pricing screens: the merchant groups (group prices, rule and category forms, the groups
// table) and the merchants (the price resolver's menu). The merchants feature owns these routes and will export its own
// typed functions; these stay here without a route tag so the route coverage count is not claimed twice. Replace them with
// those functions then (the same arrangement the orders feature has for its menus).
import { apiList, type ApiInit, type ListResult } from '@/lib/api';
import type { ClientGroup, MerchantOption } from '../types';

/** Most names one menu loads. A longer list would need a search box; the demo's menus were plain selects too. */
export const LOOKUP_CAP = 200;

/**
 * The merchant groups with their discount, in the server's order. Needs `groups:read`.
 * Assumed contract: rows carry `id`, `name`, `kind` and `discountPercent`, and may carry `merchantCount`.
 */
export function listGroupOptions(init?: ApiInit): Promise<ListResult<ClientGroup>> {
  return apiList<ClientGroup>(
    '/admin/client-groups',
    { start: 0, end: LOOKUP_CAP, sort: ['sort'], order: ['asc'] },
    undefined,
    init,
  );
}

/**
 * The merchants by name, with their group when the server joins it. Needs `clients:read`.
 * Assumed contract: rows carry `id` and `name`, and may carry `status` and `group`.
 */
export function listMerchantOptions(init?: ApiInit): Promise<ListResult<MerchantOption>> {
  return apiList<MerchantOption>(
    '/admin/clients',
    { start: 0, end: LOOKUP_CAP, sort: ['name'], order: ['asc'] },
    undefined,
    init,
  );
}
