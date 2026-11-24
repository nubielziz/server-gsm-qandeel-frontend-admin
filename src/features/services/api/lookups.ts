// Two read-only lookups for the pricing screens: the ranks (group prices, rule and category forms, the ranks table) and the merchants
// (the price resolver's menu). The accounts feature owns these routes: the ranks are read straight from `GET /admin/client-groups`, and
// the merchants through its own `listAccounts`. These stay here without a route tag so the route coverage count is not claimed twice
// (the same arrangement the orders feature has for its menus).
import { listAccounts } from '@/features/accounts';
import { apiList, type ApiInit, type ListResult } from '@/lib/api';
import { accountLabel } from '@/lib/format';
import type { ClientGroup, MerchantOption } from '../types';

/** Most names one menu loads. A longer list would need a search box; the demo's menus were plain selects too. */
export const LOOKUP_CAP = 200;

/**
 * The ranks with their discount, in the server's order. Needs `groups:read`.
 * Assumed contract: rows carry `id`, `name`, `kind` and `discountPercent`, and may carry `accountCount`.
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
 * The accounts of a merchant rank by name, with their rank (the price check is for a merchant's prices: a retail account has no price list
 * of its own, so the list asks for `rankKind=merchant`, the server having no merchant-only default). Needs `clients:read`. An account
 * with no name shows its email, and a removed one "Deleted account".
 * Assumed contract: the accounts list rows carry `id`, `name`, `email`, `status` and `rank` as `{ id, name }`.
 */
export async function listMerchantOptions(init?: ApiInit): Promise<ListResult<MerchantOption>> {
  const { data, total } = await listAccounts(
    { start: 0, end: LOOKUP_CAP, sort: ['name'], order: ['asc'], filters: { rankKind: 'merchant' } },
    init,
  );
  return {
    data: data.map((account) => ({
      id: account.id,
      name: accountLabel(account),
      status: account.status,
      group: { id: account.rank.id, name: account.rank.name },
    })),
    total,
  };
}
