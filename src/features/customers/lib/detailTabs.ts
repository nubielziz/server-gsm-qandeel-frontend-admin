// The tabs of the customer page and the addresses that open them. `/customers/<id>?tab=account` is a deep link other pages use
// (ARCHITECTURE §5.2); the Orders tab is the default and keeps the address clean. A tab with a `permission` is left out for a
// staff member who lacks it (the merchants page does the same); the server still checks every request.

export const DETAIL_TABS = [
  { id: 'orders', label: 'Orders' },
  { id: 'account', label: 'Account' },
  { id: 'wallet', label: 'Wallet', permission: 'wallet:read' },
  { id: 'support', label: 'Support' },
  { id: 'consents', label: 'Consents and data' },
  { id: 'risk', label: 'Risk' },
] as const satisfies readonly { id: string; label: string; permission?: string }[];

export type DetailTab = (typeof DETAIL_TABS)[number]['id'];

export const DEFAULT_DETAIL_TAB: DetailTab = 'orders';

/** The tabs a staff member may open: every tab without a permission, and the others when `can` says yes. */
export function visibleDetailTabs(can: (permission: string) => boolean): (typeof DETAIL_TABS)[number][] {
  return DETAIL_TABS.filter((tab) => !('permission' in tab) || can(tab.permission));
}

export function isDetailTab(value: unknown): value is DetailTab {
  return DETAIL_TABS.some((tab) => tab.id === value);
}

/** The address of one customer's page, on a given tab (the Orders tab needs no `tab`). */
export function customerPath(id: number, tab: DetailTab = DEFAULT_DETAIL_TAB): string {
  return tab === DEFAULT_DETAIL_TAB ? `/customers/${id}` : `/customers/${id}?tab=${tab}`;
}
