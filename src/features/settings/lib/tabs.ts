// The seven tabs of the Settings page and the permissions each one needs. The demo's `pageSettings` (55-p-settings.js) has four: Payment
// methods, Tax and currency, Policies and Customer emails. The map adds Notification log, Webhook deliveries and System.

export type SettingsTab = 'payments' | 'tax' | 'policies' | 'notifications' | 'log' | 'webhooks' | 'system';

/** The tab the page opens on. It is left out of the address, as the demo's default tab is. */
export const DEFAULT_TAB: SettingsTab = 'payments';

/**
 * One tab. `permissions` are any-of: one is enough to show the tab, and the tab then offers only what the role may read. Hiding a
 * tab is a hint; the server still checks each call.
 */
export type TabSpec = { id: SettingsTab; label: string; permissions: readonly string[] };

/** The tabs in the order the page shows them. Tax and currency opens with the tax read or the currency list (`settings:update`). */
export const SETTINGS_TABS: readonly TabSpec[] = [
  { id: 'payments', label: 'Payment methods', permissions: ['payments:gateways'] },
  { id: 'tax', label: 'Tax and currency', permissions: ['tax:read', 'settings:update'] },
  { id: 'policies', label: 'Policies', permissions: ['settings:read'] },
  { id: 'notifications', label: 'Customer emails', permissions: ['notifications:read'] },
  { id: 'log', label: 'Notification log', permissions: ['notifications:read'] },
  { id: 'webhooks', label: 'Webhook deliveries', permissions: ['webhooks:read'] },
  { id: 'system', label: 'System', permissions: ['settings:read'] },
];

/** Any one of these opens the page; each tab then shows only what the role may read. */
export const PAGE_PERMISSIONS = [
  'settings:read',
  'payments:gateways',
  'tax:read',
  'notifications:read',
  'webhooks:read',
] as const;

/** Whether an address parameter names a tab. */
export function isSettingsTab(value: string | null): value is SettingsTab {
  return SETTINGS_TABS.some((tab) => tab.id === value);
}

/** The address of a tab, for links from other pages (`/settings?tab=tax`, the dashboard's "Refresh rates"). */
export function settingsPath(tab: SettingsTab = DEFAULT_TAB): string {
  return tab === DEFAULT_TAB ? '/settings' : `/settings?tab=${tab}`;
}
