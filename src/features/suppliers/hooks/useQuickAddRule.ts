// Whether a shop price rule is active, for the Add services flow: its shop switch is on by default only when one is. The list of rules is
// the storefront feature's API, reached through its index. Reading the rules needs `pricing:read`; without it, or when the read
// fails, the answer is "unknown" and the server decides when the run is started.
import { listRetailPriceRules } from '@/features/storefront';
import { useApiQuery } from '@/lib/query';
import type { ShopRule } from '../lib/quickAddFlow';

/** The newest read of "is any shop price rule active", kept under the suppliers' own keys. */
export const SUPPLIER_SHOP_RULE_KEY = ['api', 'suppliers', 'shop-rule'] as const;

/**
 * What is known about the active shop price rules. `ready` is false until the staff member's permissions are known; `canRead` is
 * `pricing:read`. One row is enough to tell: the list is asked for the active rules only.
 */
export function useShopRule(ready: boolean, canRead: boolean): ShopRule {
  const query = useApiQuery({
    queryKey: [...SUPPLIER_SHOP_RULE_KEY],
    queryFn: ({ signal }) =>
      listRetailPriceRules({ filters: { isActive: true }, start: 0, end: 1 }, { signal }),
    enabled: ready && canRead,
    retry: false,
  });
  if (!ready) return 'loading';
  if (!canRead || query.isError) return 'unknown';
  if (query.data === undefined) return 'loading';
  return query.data.data.length > 0 ? 'active' : 'none';
}
