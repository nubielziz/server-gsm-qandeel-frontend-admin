// The five tabs of the Storefront page and the permissions each one needs. Ports the `tabs` of pageStorefront in
// 50-p-storefront.js (Services on sale, Landing pages, Content and legal, Help centre) and swaps the demo's Live preview for
// the TAC catalogue the map adds (MISMATCHES M4 has the preview).

export type StorefrontTab = 'listings' | 'landing' | 'content' | 'help' | 'tac';

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
  { id: 'landing', label: 'Landing pages', anyOf: ['storefront:read'] },
  { id: 'content', label: 'Content and legal', anyOf: ['storefront:read', 'legal:read'] },
  { id: 'help', label: 'Help centre', anyOf: ['storefront:read'] },
  { id: 'tac', label: 'TAC catalogue', anyOf: ['catalog:read'] },
];

/** Any one of these opens the page; each tab then shows only what the role may read (MISMATCHES M19 has the same shape). */
export const PAGE_PERMISSIONS = ['storefront:read', 'legal:read', 'catalog:read'] as const;

/** Whether an address parameter names a tab. */
export function isStorefrontTab(value: string | null): value is StorefrontTab {
  return STOREFRONT_TABS.some((tab) => tab.id === value);
}
