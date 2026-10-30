// Addresses of the merchants pages, for links from other pages (ARCHITECTURE §5.2): one merchant and the filtered list.
import type { MerchantTab } from './status';

/** The tabs of the detail page, in the order the page shows them. */
export type DetailTab = 'orders' | 'wallet' | 'pricing' | 'api';

/** The address of one merchant's page, optionally on a tab (`/merchants/7?tab=wallet`). */
export function merchantPath(id: number, tab?: DetailTab): string {
  return tab && tab !== 'orders' ? `/merchants/${id}?tab=${tab}` : `/merchants/${id}`;
}

/**
 * The address of the merchants page with some filters set (`{ tab: 'pending' }`, `{ group: 3 }`), for links from other
 * pages such as the dashboard. Defaults are left out, as on the page itself.
 */
export function merchantsListPath(
  patch: { tab?: MerchantTab; group?: number | string; q?: string } = {},
): string {
  const params = new URLSearchParams();
  if (patch.tab && patch.tab !== 'all') params.set('tab', patch.tab);
  if (patch.group) params.set('group', String(patch.group));
  if (patch.q) params.set('q', patch.q);
  const query = params.toString();
  return query ? `/merchants?${query}` : '/merchants';
}
