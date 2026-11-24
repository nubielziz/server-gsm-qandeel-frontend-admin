// The supplier, merchant and rank names behind the filter menus and the reroute menu. They are read once and kept for a few
// minutes: the lists change rarely, and a menu should not wait for a request each time the page opens.
import { listAccounts, listRanks, toListQuery as toAccountsQuery } from '@/features/accounts';
import { useApiQuery } from '@/lib/query';
import { listSuppliers } from '@/features/suppliers';
import type { AccountOption, RankOption, SupplierOption } from '../types';

/** Most names one menu loads. A longer list would need a search box; the demo's menus were plain selects too. */
const LOOKUP_CAP = 200;
import { ORDER_LOOKUP_KEY } from './keys';

const FIVE_MINUTES = 5 * 60_000;

/** The suppliers. Pass `enabled: false` when the staff member lacks `suppliers:read`. */
export function useSupplierOptions(enabled = true) {
  return useApiQuery({
    queryKey: [...ORDER_LOOKUP_KEY, 'suppliers'],
    // The suppliers feature owns `GET /admin/suppliers`. The menus show health (`status` here) and skip disabled ones.
    queryFn: ({ signal }) =>
      listSuppliers({ start: 0, end: LOOKUP_CAP, sort: ['name'], order: ['asc'] }, { signal }),
    select: (result): SupplierOption[] =>
      result.data.map(({ id, name, health, status }) => ({
        id,
        name,
        status: health,
        enabled: status === 'active',
      })),
    enabled,
    staleTime: FIVE_MINUTES,
  });
}

/**
 * The merchants: the accounts that hold a merchant rank. Pass `enabled: false` when the staff member lacks `clients:read`. A
 * retail account is not in the menu; an order of one is found by the rank menu or from the account's own record.
 */
export function useMerchantOptions(enabled = true) {
  return useApiQuery({
    queryKey: [...ORDER_LOOKUP_KEY, 'merchants'],
    // The accounts feature owns `GET /admin/clients`; the menu needs only ids and names, first 200 by name.
    queryFn: ({ signal }) =>
      listAccounts(
        toAccountsQuery(
          { rankKind: 'merchant' },
          { start: 0, end: LOOKUP_CAP, sort: ['name'], order: ['asc'] },
        ),
        { signal },
      ),
    select: (result): AccountOption[] => result.data.map(({ id, name }) => ({ id, name })),
    enabled,
    staleTime: FIVE_MINUTES,
  });
}

/** The ranks, every kind. Pass `enabled: false` when the staff member lacks `groups:read`. */
export function useRankOptions(enabled = true) {
  return useApiQuery({
    queryKey: [...ORDER_LOOKUP_KEY, 'ranks'],
    // The accounts feature owns `GET /admin/client-groups`; the menu needs only ids and names, in the ranks' own order.
    queryFn: ({ signal }) =>
      listRanks({ start: 0, end: LOOKUP_CAP, sort: ['sort'], order: ['asc'] }, { signal }),
    select: (result): RankOption[] => result.data.map(({ id, name }) => ({ id, name })),
    enabled,
    staleTime: FIVE_MINUTES,
  });
}
