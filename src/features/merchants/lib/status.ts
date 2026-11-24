// The words and looks of a merchant's status, and the tabs of the merchants page. Ports merBadge of 20-ui.js and the `tabs`
// of pageMerchants in 42-p-merchants.js, plus the Groups tab the map adds (MISMATCHES M46).
import type { BadgeTone, IconName } from '@/components/ui';
import type { ClientStatus } from '../types';

/**
 * How a status looks: the demo's merBadge (green Active, amber Pending, red Suspended). `pending` is a legacy status: staff-made
 * accounts are active at once, but an account made before that change may still be `pending` until staff activate it.
 */
export const STATUS_BADGE: Readonly<
  Record<ClientStatus, { tone: BadgeTone; icon: IconName; label: string }>
> = {
  active: { tone: 'good', icon: 'checkCircle', label: 'Active' },
  pending: { tone: 'warn', icon: 'clock', label: 'Pending' },
  suspended: { tone: 'crit', icon: 'ban', label: 'Suspended' },
};

/** The status words, in the order the tabs use. */
export const CLIENT_STATUSES: readonly ClientStatus[] = ['active', 'pending', 'suspended'];

/** The tabs of the page: three status filters of the merchant table, then the groups list. */
export type MerchantTab = 'all' | 'active' | 'suspended' | 'groups';

/** One tab of the list: its id, its label and the permission it needs. */
export type MerchantTabSpec = {
  id: MerchantTab;
  label: string;
  /** The read permission the tab needs; a tab the staff member may not read is left out. */
  permission: string;
};

/** The tabs in the order the page shows them. */
export const MERCHANT_TABS: readonly MerchantTabSpec[] = [
  { id: 'all', label: 'All', permission: 'clients:read' },
  { id: 'active', label: 'Active', permission: 'clients:read' },
  { id: 'suspended', label: 'Suspended', permission: 'clients:read' },
  { id: 'groups', label: 'Groups', permission: 'groups:read' },
];

/** The tabs that show the merchant table. */
export const STATUS_TABS: readonly MerchantTab[] = ['all', 'active', 'suspended'];

/** Whether a value from the address names a tab. */
export function isMerchantTab(value: string | null): value is MerchantTab {
  return MERCHANT_TABS.some((tab) => tab.id === value);
}

/** The status a tab filters by; `all` and the groups list filter by none. */
export function tabStatus(tab: MerchantTab): ClientStatus | undefined {
  return tab === 'active' || tab === 'suspended' ? tab : undefined;
}

/** True for the three tabs that show the merchant table. */
export function isStatusTab(tab: MerchantTab): boolean {
  return STATUS_TABS.includes(tab);
}
