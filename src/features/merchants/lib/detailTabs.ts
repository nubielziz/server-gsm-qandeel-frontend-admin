// The tabs of a merchant's page and how the address names them (`/merchants/7?tab=wallet`). Ports the `tabs` of pageMerchant in
// 42-p-merchants.js. A tab whose read permission the staff member lacks is left out.
import type { DetailTab } from './paths';

export type DetailTabSpec = {
  id: DetailTab;
  label: string;
  /** The read permission the tab needs. */
  permission: string;
};

export const DETAIL_TABS: readonly DetailTabSpec[] = [
  { id: 'orders', label: 'Orders', permission: 'orders:read' },
  { id: 'wallet', label: 'Wallet ledger', permission: 'wallet:read' },
  { id: 'pricing', label: 'Pricing', permission: 'pricing:read' },
  { id: 'api', label: 'API access', permission: 'api_keys:read' },
];

/** The open tab: the one in the address when the staff member may open it, else the first they may. */
export function parseDetailTab(
  params: URLSearchParams,
  visible: readonly DetailTab[],
): DetailTab | undefined {
  const named = params.get('tab');
  return visible.find((tab) => tab === named) ?? visible[0];
}

/** The address with another tab. The first tab is the default and leaves no `tab`; an open order drawer is closed. */
export function writeDetailTab(base: URLSearchParams, tab: DetailTab): URLSearchParams {
  const next = new URLSearchParams(base);
  if (tab === DETAIL_TABS[0].id) next.delete('tab');
  else next.set('tab', tab);
  next.delete('order');
  return next;
}
