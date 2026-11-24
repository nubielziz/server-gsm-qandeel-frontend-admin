// The three tabs of the Shop content page and the permissions each one needs. Ports the Content and legal and Help centre tabs of
// pageStorefront in 50-p-storefront.js and adds the Search tab of the shop's search engine. The demo's Live preview is a link (MISMATCHES M4)
// and its Landing pages tab and the TAC catalogue tab the map added were retired (decision 025). The listings, publish and retail pricing
// parts of the old Storefront page moved to the Product / Services page; their components stay in this feature.

export type StorefrontTab = 'content' | 'help' | 'search';

/** The tab the page opens on. Its links and the page itself write it into the address (`?tab=content`), never leave it out. */
export const DEFAULT_TAB: StorefrontTab = 'content';

/**
 * One tab. `anyOf` lists the permissions that open it: one is enough, and the tab then shows only the parts the role may
 * read (the Content tab holds pages and legal documents). Hiding a tab is a hint; the server still checks each call.
 */
export type TabSpec = { id: StorefrontTab; label: string; anyOf: readonly string[] };

/** The tabs in the order the page shows them. */
export const STOREFRONT_TABS: readonly TabSpec[] = [
  { id: 'content', label: 'Content and legal', anyOf: ['storefront:read', 'legal:read'] },
  { id: 'help', label: 'Help centre', anyOf: ['storefront:read'] },
  // Backend feature 29 (no demo tab): the shop's search index.
  { id: 'search', label: 'Search', anyOf: ['storefront:read'] },
];

/** Any one of these opens the page; each tab then shows only what the role may read (MISMATCHES M19 has the same shape). */
export const PAGE_PERMISSIONS = ['storefront:read', 'legal:read'] as const;

/** Whether an address parameter names a tab. */
export function isStorefrontTab(value: string | null): value is StorefrontTab {
  return STOREFRONT_TABS.some((tab) => tab.id === value);
}
