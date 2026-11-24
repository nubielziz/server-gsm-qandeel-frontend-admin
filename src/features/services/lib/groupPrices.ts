// What the group prices form remembers about the storefront's retail price: the figure it loaded, which it sends back as
// `retailPriceSeen` so the server can tell a retail box nobody touched from a price staff typed.
import type { Money } from '@/lib/api';
import type { ClientGroup, ServiceGroupPrice } from '../types';

/** `kind` of the storefront's single retail group among the ranks. */
export const RETAIL_GROUP_KIND = 'b2c_retail';

/**
 * The retail price the form loaded: the saved price of the group of kind `b2c_retail`, as the server wrote it, or `null` when
 * the service had no retail price or the menu lists no retail group (then no row can be told apart as the retail one). It only
 * picks a row; it computes nothing.
 */
export function loadedRetailPrice(
  groups: readonly ClientGroup[],
  saved: readonly ServiceGroupPrice[],
): Money | null {
  const retail = groups.find((group) => group.kind === RETAIL_GROUP_KIND);
  if (!retail) return null;
  return saved.find((entry) => entry.groupId === retail.id)?.price ?? null;
}
