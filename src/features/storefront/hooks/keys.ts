// Query keys of the storefront reads that are not Refine resources (decision 005: they start with `['api', <feature>]`), and
// what a change makes stale. React Query matches the keys as prefixes.
import type { QueryKey } from '@tanstack/react-query';
import type { InvalidateTarget } from '@/lib/query';

/** The counts above the tables and on the first tab (a list call with `_start=0&_end=1`, read from the total). */
export const STOREFRONT_COUNTS_KEY = ['api', 'storefront', 'counts'] as const;

/** The services menu of the Add listing dialog. */
export const SERVICE_PICKER_KEY = ['api', 'storefront', 'service-picker'] as const;

/** The reads a change makes stale besides Refine's own: the counts. */
export const STOREFRONT_STALE_KEYS: QueryKey[] = [STOREFRONT_COUNTS_KEY];

/** The Refine targets of a changed resource: every list of it. */
export function staleResource(resource: string): InvalidateTarget[] {
  return [{ resource }];
}

/** How many names the service menu loads. A longer catalog would need a search box; the demo's menus were plain selects. */
export const PICKER_CAP = 200;

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
