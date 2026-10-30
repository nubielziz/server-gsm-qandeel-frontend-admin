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
