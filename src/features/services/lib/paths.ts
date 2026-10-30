// Addresses into and out of the Services & pricing page (ARCHITECTURE §5.2): `/services?belowFloor=true`, a tab with a
// service selected, the supplier and merchant pages this page links to. Other pages build links with `servicesListPath`.
import type { InventoryStatus, ServiceType } from '../types';
import { DEFAULT_TAB, type ServicesTab } from './tabs';

/** What a link into the page can set. Defaults are left out of the address. */
export type ServicesLink = {
  tab?: ServicesTab;
  /** Services tab: search text. */
  q?: string;
  type?: ServiceType;
  belowFloor?: boolean;
  /** Services tab: `disabled`. Code inventory tab: a code status. */
  status?: 'disabled' | InventoryStatus;
  /** Price resolver and Code inventory tabs: the selected service. */
  service?: number;
  /** Price resolver tab: the selected merchant. */
  merchant?: number;
};

/**
 * The address of the Services & pricing page with some state set: `servicesListPath({ belowFloor: true })` is the
 * services priced under their floor, `servicesListPath({ tab: 'resolver', service: 4 })` traces service 4.
 */
export function servicesListPath(link: ServicesLink = {}): string {
  const params = new URLSearchParams();
  if (link.tab && link.tab !== DEFAULT_TAB) params.set('tab', link.tab);
  if (link.q) params.set('q', link.q);
  if (link.type) params.set('type', link.type);
  if (link.belowFloor) params.set('belowFloor', 'true');
  if (link.status) params.set('status', link.status);
  if (link.service !== undefined) params.set('service', String(link.service));
  if (link.merchant !== undefined) params.set('merchant', String(link.merchant));
  const query = params.toString();
  return query ? `/services?${query}` : '/services';
}

/** One supplier on the Suppliers page (the suppliers feature will export its own `supplierPath`; same address). */
export function supplierLink(id: number): string {
  return `/suppliers?supplier=${id}`;
}

/** The merchant groups, which are managed on the merchants page. */
export const MERCHANT_GROUPS_PATH = '/merchants?tab=groups';

/** Where the demo's empty state sent "Import from supplier": the suppliers page imports services. */
export const SUPPLIERS_PATH = '/suppliers';
