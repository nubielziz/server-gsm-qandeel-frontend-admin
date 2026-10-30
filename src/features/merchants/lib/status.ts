// The words and looks of a merchant's status, and the tabs of the merchants page. Ports merBadge of 20-ui.js and the `tabs`
// of pageMerchants in 42-p-merchants.js, plus the Groups and Verification tabs the map adds (MISMATCHES M46, MISMATCHES M47).
import type { BadgeTone, IconName } from '@/components/ui';
import type { ClientKycStatus, ClientStatus } from '../types';

/** How a status looks: the demo's merBadge (green Active, amber Pending, red Suspended). */
export const STATUS_BADGE: Readonly<
  Record<ClientStatus, { tone: BadgeTone; icon: IconName; label: string }>
> = {
  active: { tone: 'good', icon: 'checkCircle', label: 'Active' },
  pending: { tone: 'warn', icon: 'clock', label: 'Pending' },
  suspended: { tone: 'crit', icon: 'ban', label: 'Suspended' },
};

/** The status words, in the order the tabs use. */
export const CLIENT_STATUSES: readonly ClientStatus[] = ['active', 'pending', 'suspended'];

/** The merchant's verification state in a sentence ("KYC is in review", the demo's pending note). */
export const KYC_WORDS: Readonly<Record<ClientKycStatus, string>> = {
  none: 'not submitted',
  pending: 'in review',
  approved: 'verified',
  rejected: 'rejected',
};

/** The tabs of the page: four status filters of the merchant table, then the two other lists. */
export type MerchantTab = 'all' | 'active' | 'pending' | 'suspended' | 'groups' | 'verification';

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
  { id: 'pending', label: 'Pending approval', permission: 'clients:read' },
  { id: 'suspended', label: 'Suspended', permission: 'clients:read' },
  { id: 'groups', label: 'Groups', permission: 'groups:read' },
  { id: 'verification', label: 'Verification', permission: 'kyc:read' },
];

/** The tabs that show the merchant table. */
export const STATUS_TABS: readonly MerchantTab[] = ['all', 'active', 'pending', 'suspended'];

/** Whether a value from the address names a tab. */
export function isMerchantTab(value: string | null): value is MerchantTab {
  return MERCHANT_TABS.some((tab) => tab.id === value);
}

/** The status a tab filters by; `all` and the two other lists filter by none. */
export function tabStatus(tab: MerchantTab): ClientStatus | undefined {
  return tab === 'active' || tab === 'pending' || tab === 'suspended' ? tab : undefined;
}

/** True for the four tabs that show the merchant table. */
export function isStatusTab(tab: MerchantTab): boolean {
  return STATUS_TABS.includes(tab);
}
