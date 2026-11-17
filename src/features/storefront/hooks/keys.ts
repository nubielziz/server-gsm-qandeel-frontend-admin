// Query keys of the storefront reads that are not Refine resources (decision 005: they start with `['api', <feature>]`), and
// what a change makes stale. React Query matches the keys as prefixes.
import type { QueryKey } from '@tanstack/react-query';
import type { InvalidateTarget } from '@/lib/query';

/** The counts above the tables and on the first tab (a list call with `_start=0&_end=1`, read from the total). */
export const STOREFRONT_COUNTS_KEY = ['api', 'storefront', 'counts'] as const;

/** The services the Add listing dialog's search offers for one search text (`''` is the first page, by name). */
export const serviceSearchKey = (q: string) => ['api', 'storefront', 'service-search', q] as const;

/** The reads a change makes stale besides Refine's own: the counts. */
export const STOREFRONT_STALE_KEYS: QueryKey[] = [STOREFRONT_COUNTS_KEY];

/** The Refine targets of a changed resource: every list of it. */
export function staleResource(resource: string): InvalidateTarget[] {
  return [{ resource }];
}

/**
 * How many services one search of the Add listing dialog asks for. The server searches the whole catalog (a supplier's
 * Quick add can bring thousands), so a short page is enough: the staff member types more to narrow it.
 */
export const SERVICE_SEARCH_ROWS = 20;

/** The pause after the last keystroke before the Add listing dialog asks the server, so typing sends one request. */
export const SERVICE_SEARCH_PAUSE_MS = 250;

/** The five minutes a menu is kept: the catalog changes rarely, and a dialog should not wait for a request each time. */
export const PICKER_STALE_MS = 5 * 60_000;

/** One listing with its Markdown bodies, read when the editor opens (`['api', 'storefront', 'listing', id]`). */
export const listingDetailKey = (id: number) => ['api', 'storefront', 'listing', id] as const;

/** Refine resources of the search tab's lists (`search-synonyms`, `search-pins`, `search-hidden-terms`). */
export const SEARCH_RESOURCES = {
  synonyms: 'search-synonyms',
  pins: 'search-pins',
  hiddenTerms: 'search-hidden-terms',
} as const;

/** The search report of one range (`['api', 'storefront', 'search-report', days]`). */
export const searchReportKey = (days: number) => ['api', 'storefront', 'search-report', days] as const;

/** The preview of one query. A change to a synonym or a pin makes every preview stale. */
export const SEARCH_PREVIEW_KEY = ['api', 'storefront', 'search-preview'] as const;
export const searchPreviewKey = (q: string) => [...SEARCH_PREVIEW_KEY, q] as const;

/** The index status, which a running rebuild refreshes every few seconds. */
export const SEARCH_INDEX_KEY = ['api', 'storefront', 'search-index'] as const;

/** The listed services the pin picker offers for one search text. */
export const searchPickerKey = (q: string) => ['api', 'storefront', 'search-picker', q] as const;

/** Every read a change of a synonym or a pin makes stale besides Refine's own: the previews. */
export const SEARCH_RULE_STALE_KEYS: QueryKey[] = [SEARCH_PREVIEW_KEY];

/** The reads a rebuild request makes stale: the index status, which then shows the running state. */
export const SEARCH_INDEX_STALE_KEYS: QueryKey[] = [SEARCH_INDEX_KEY];

/** How often the index status is read while a rebuild runs. */
export const REBUILD_POLL_MS = 5_000;

/** How many listed services the pin picker shows for a search text. */
export const PICKER_RESULTS = 8;

/** Refine resources of the Retail pricing tab's lists (`retail-price-rules`, `retail-price-changes`). */
export const RETAIL_RESOURCES = { rules: 'retail-price-rules', changes: 'retail-price-changes' } as const;

/** The server's preview of one rule change (`['api', 'storefront', 'retail-rule-preview', <change>]`); never kept after the dialog. */
export const retailPreviewKey = (change: unknown) =>
  ['api', 'storefront', 'retail-rule-preview', change] as const;

/** The categories the rule dialog's search offers for one search text. */
export const categorySearchKey = (q: string) => ['api', 'storefront', 'category-search', q] as const;

/** How many categories one search of the rule dialog asks for (the menus of the services pages stop at 200 without a word). */
export const CATEGORY_SEARCH_ROWS = 20;
