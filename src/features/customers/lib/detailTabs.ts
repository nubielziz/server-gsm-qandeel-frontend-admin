// The tabs of the customer page and the addresses that open them. `/customers/<id>?tab=account` is a deep link other pages use
// (ARCHITECTURE §5.2); the Orders tab is the default and keeps the address clean.

export const DETAIL_TABS = [
  { id: 'orders', label: 'Orders' },
  { id: 'account', label: 'Account' },
  { id: 'support', label: 'Support' },
  { id: 'consents', label: 'Consents and data' },
  { id: 'risk', label: 'Risk' },
] as const;

export type DetailTab = (typeof DETAIL_TABS)[number]['id'];

export const DEFAULT_DETAIL_TAB: DetailTab = 'orders';

export function isDetailTab(value: unknown): value is DetailTab {
  return DETAIL_TABS.some((tab) => tab.id === value);
}

/** The address of one customer's page, on a given tab (the Orders tab needs no `tab`). */
export function customerPath(id: number, tab: DetailTab = DEFAULT_DETAIL_TAB): string {
  return tab === DEFAULT_DETAIL_TAB ? `/customers/${id}` : `/customers/${id}?tab=${tab}`;
}
