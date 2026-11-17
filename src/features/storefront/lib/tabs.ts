// The eight tabs of the Storefront page and the permissions each one needs. Ports the `tabs` of pageStorefront in
// 50-p-storefront.js (Services on sale, Landing pages, Content and legal, Help centre), swaps the demo's Live preview for
// the TAC catalogue the map adds (MISMATCHES M4 has the preview), adds the Publish and Retail pricing tabs of backend feature 31
// and ends with the Search tab of the shop's search engine.

export type StorefrontTab =
  'listings' | 'publish' | 'pricing' | 'landing' | 'content' | 'help' | 'tac' | 'search';

/** The tab the page opens on. It is left out of the address, as the demo's default tab is. */
export const DEFAULT_TAB: StorefrontTab = 'listings';

/**
 * One tab. `anyOf` lists the permissions that open it: one is enough, and the tab then shows only the parts the role may
 * read (the Content tab holds pages and legal documents). Hiding a tab is a hint; the server still checks each call.
 */
export type TabSpec = { id: StorefrontTab; label: string; anyOf: readonly string[] };

/** The tabs in the order the page shows them. */
export const STOREFRONT_TABS: readonly TabSpec[] = [
  { id: 'listings', label: 'Services on sale', anyOf: ['storefront:read'] },
  // Backend feature 31 (no demo tab): puts services on the shop in bulk, from a preview the server keeps (`?tab=publish&run=<id>`).
  { id: 'publish', label: 'Publish', anyOf: ['storefront:create'] },
  // Backend feature 31 (no demo tab): the rules that price the shop from each service's cost, and the price changes they make.
  { id: 'pricing', label: 'Retail pricing', anyOf: ['pricing:read'] },
  { id: 'landing', label: 'Landing pages', anyOf: ['storefront:read'] },
  { id: 'content', label: 'Content and legal', anyOf: ['storefront:read', 'legal:read'] },
  { id: 'help', label: 'Help centre', anyOf: ['storefront:read'] },
  { id: 'tac', label: 'TAC catalogue', anyOf: ['catalog:read'] },
  // Backend feature 29 (no demo tab): synonyms, pinned results, the report and the index of the shop's search.
  { id: 'search', label: 'Search', anyOf: ['storefront:read'] },
];

/** Any one of these opens the page; each tab then shows only what the role may read (MISMATCHES M19 has the same shape). */
export const PAGE_PERMISSIONS = ['storefront:read', 'legal:read', 'catalog:read', 'pricing:read'] as const;

/** Whether an address parameter names a tab. */
export function isStorefrontTab(value: string | null): value is StorefrontTab {
  return STOREFRONT_TABS.some((tab) => tab.id === value);
}
