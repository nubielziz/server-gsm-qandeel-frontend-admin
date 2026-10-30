// The five tabs of the Services & pricing page and the permissions each one needs. Ports the `tabs` of pageServices in
// 43-p-services.js (Services, Price resolver, Rules and groups) and adds Categories and Code inventory from the map.

export type ServicesTab = 'services' | 'resolver' | 'rules' | 'categories' | 'inventory';

/** The tab the page opens on. It is left out of the address, as the demo's default tab is. */
export const DEFAULT_TAB: ServicesTab = 'services';

/**
 * One tab. `permissions` are all needed to use it: the resolver reads prices (`pricing:read`) and must list services to
 * choose from (`catalog:read`). Hiding a tab is a hint; the server still checks each call.
 */
export type TabSpec = { id: ServicesTab; label: string; permissions: readonly string[] };

/** The tabs in the order the page shows them. */
export const SERVICES_TABS: readonly TabSpec[] = [
  { id: 'services', label: 'Services', permissions: ['catalog:read'] },
  { id: 'resolver', label: 'Price resolver', permissions: ['pricing:read', 'catalog:read'] },
  { id: 'rules', label: 'Rules and groups', permissions: ['pricing:read'] },
  { id: 'categories', label: 'Categories', permissions: ['catalog:read'] },
  { id: 'inventory', label: 'Code inventory', permissions: ['inventory:read'] },
];

/** Any one of these opens the page; each tab then shows only what the role may read (MISMATCHES M19 has the same shape). */
export const PAGE_PERMISSIONS = ['catalog:read', 'pricing:read', 'inventory:read'] as const;

/** Whether an address parameter names a tab. */
export function isServicesTab(value: string | null): value is ServicesTab {
  return SERVICES_TABS.some((tab) => tab.id === value);
}
