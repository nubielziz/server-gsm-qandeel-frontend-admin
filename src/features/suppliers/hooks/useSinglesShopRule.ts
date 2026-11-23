// Whether a shop price rule is switched on, for the Add flow's "Prepare them for the shop" switch: without one no service would get a
// shop price. The rules list needs `pricing:read`; without that permission the answer is unknown and the switch is not held back.
import { listRetailPriceRules } from '@/features/storefront';
import { useApiQuery } from '@/lib/query';
import { useSupplierGrants } from './useSupplierGrants';

/** `checking` while the server is asked, `unknown` when it cannot be asked (no `pricing:read`, or the read failed). */
export type ShopRuleState = 'checking' | 'active' | 'none' | 'unknown';

const SHOP_RULE_KEY = ['api', 'suppliers', 'add-flow-shop-rule'] as const;

/**
 * How many rules are on is the total of a one-row list call (`isActive=true`), so the server counts. `enabled` is false until the
 * staff member's permissions are known.
 */
export function useSinglesShopRule(enabled: boolean): ShopRuleState {
  const query = useApiQuery({
    queryKey: SHOP_RULE_KEY,
    queryFn: ({ signal }) =>
      listRetailPriceRules({ start: 0, end: 1, filters: { isActive: true } }, { signal }),
    select: (answer) => answer.total,
    enabled,
  });
  if (!enabled) return 'unknown';
  if (query.isPending) return 'checking';
  if (query.isError) return 'unknown';
  return query.data > 0 ? 'active' : 'none';
}

/** What the "Prepare them for the shop" switch may do, and why not. */
export type ShopSwitchState = {
  /** The switch cannot be turned on: the permission is missing, no rule is on, or the rules are still being read. */
  blocked: boolean;
  /** The reason, for the title of the switch and the line under it. */
  reason?: string;
  /** The reason is that no rule is switched on, so the line under the switch can link to the rules. */
  noRule: boolean;
};

/**
 * Works out the lock of the switch. A console-made preview needs `storefront:create`, and a shop price rule must be on, or no
 * service in it would get a price. Whoever lacks `pricing:read` cannot be told about the rules, so the switch is not held back for
 * them: the preview itself says, row by row, which services have no price. The server checks every permission again.
 */
export function useSinglesShopSwitch(): ShopSwitchState {
  const grants = useSupplierGrants();
  const permission = grants.needs('storefront:create');
  const rule = useSinglesShopRule(grants.ready && !permission.disabled && grants.can('pricing:read'));
  if (permission.disabled) return { blocked: true, reason: permission.title, noRule: false };
  if (rule === 'checking') return { blocked: true, reason: 'Checking the shop price rules…', noRule: false };
  if (rule === 'none')
    return {
      blocked: true,
      reason: 'No shop price rule is switched on, so no service would get a shop price.',
      noRule: true,
    };
  return { blocked: false, noRule: false };
}
