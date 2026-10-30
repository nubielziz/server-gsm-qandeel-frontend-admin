// The three tabs of the Commissions page. Ports the `tabs` of pageCommissions in 46-p-commissions.js (Accruals, Agents, Plans).

export type CommissionsTab = 'accruals' | 'agents' | 'plans';

/** The tab the page opens on. It is left out of the address, as the demo's default tab is. */
export const DEFAULT_TAB: CommissionsTab = 'accruals';

/** The tabs in the order the page shows them. All three need `commissions:read` (the page permission), so none is hidden. */
export const COMMISSION_TABS: readonly { id: CommissionsTab; label: string }[] = [
  { id: 'accruals', label: 'Accruals' },
  { id: 'agents', label: 'Agents' },
  { id: 'plans', label: 'Plans' },
];

/** Whether an address parameter names a tab. */
export function isCommissionsTab(value: string | null): value is CommissionsTab {
  return COMMISSION_TABS.some((tab) => tab.id === value);
}
