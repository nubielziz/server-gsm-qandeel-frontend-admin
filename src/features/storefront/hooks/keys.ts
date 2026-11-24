// Query keys of the storefront reads that are not Refine resources (decision 005: they start with `['api', <feature>]`), and
// what a change makes stale. React Query matches the keys as prefixes.
import type { QueryKey } from '@tanstack/react-query';
import type { InvalidateTarget } from '@/lib/query';

/** The counts above the tables and on the first tab (a list call with `_start=0&_end=1`, read from the total). */
export const STOREFRONT_COUNTS_KEY = ['api', 'storefront', 'counts'] as const;

/** The reads a change makes stale besides Refine's own: the counts. */
export const STOREFRONT_STALE_KEYS: QueryKey[] = [STOREFRONT_COUNTS_KEY];

/** The Refine targets of a changed resource: every list of it. */
export function staleResource(resource: string): InvalidateTarget[] {
  return [{ resource }];
}

/** The pause after the last keystroke before the category search asks the server, so typing sends one request. */
export const SERVICE_SEARCH_PAUSE_MS = 250;

/** The five minutes a menu is kept: the catalog changes rarely, and a dialog should not wait for a request each time. */
export const PICKER_STALE_MS = 5 * 60_000;

/** One listing with its Markdown bodies, read when the editor opens (`['api', 'storefront', 'listing', id]`). */
export const listingDetailKey = (id: number) => ['api', 'storefront', 'listing', id] as const;

/** The index status, which a running rebuild refreshes every few seconds. */
export const SEARCH_INDEX_KEY = ['api', 'storefront', 'search-index'] as const;

/** The reads a rebuild request makes stale: the index status, which then shows the running state. */
export const SEARCH_INDEX_STALE_KEYS: QueryKey[] = [SEARCH_INDEX_KEY];

/** How often the index status is read while a rebuild runs. */
export const REBUILD_POLL_MS = 5_000;

/** Refine resources of the Retail pricing tab's lists (`retail-price-rules`, `retail-price-changes`). */
export const RETAIL_RESOURCES = { rules: 'retail-price-rules', changes: 'retail-price-changes' } as const;

/** The server's preview of one rule change (`['api', 'storefront', 'retail-rule-preview', <change>]`); never kept after the dialog. */
export const retailPreviewKey = (change: unknown) =>
  ['api', 'storefront', 'retail-rule-preview', change] as const;

/** The categories the rule dialog's search offers for one search text. */
export const categorySearchKey = (q: string) => ['api', 'storefront', 'category-search', q] as const;

/** How many categories one search of the rule dialog asks for (the menus of the services pages stop at 200 without a word). */
export const CATEGORY_SEARCH_ROWS = 20;

/** One publish run, read again while it works (`['api', 'storefront', 'publish-run', id]`). */
export const PUBLISH_RUN_KEY = ['api', 'storefront', 'publish-run'] as const;
export const publishRunKey = (id: number) => [...PUBLISH_RUN_KEY, id] as const;

/** The earlier runs (the history on the Publish tab's start, and the lists other tabs read by `quickAddRunId`). */
export const PUBLISH_RUNS_KEY = ['api', 'storefront', 'publish-runs'] as const;

/** The rows of one run (`['api', 'storefront', 'publish-items', runId, <query>]`): a change to a run makes every page stale. */
export const PUBLISH_ITEMS_KEY = ['api', 'storefront', 'publish-items'] as const;

/** The suppliers the Publish tab's "A supplier's services" menu offers. */
export const PUBLISH_SUPPLIERS_KEY = ['api', 'storefront', 'publish-suppliers'] as const;

/** The reads a run that ended (or a switch that ended) makes stale besides Refine's own: the history, the rows and the counts. */
export const PUBLISH_STALE_KEYS: QueryKey[] = [PUBLISH_RUNS_KEY, PUBLISH_ITEMS_KEY, STOREFRONT_COUNTS_KEY];
