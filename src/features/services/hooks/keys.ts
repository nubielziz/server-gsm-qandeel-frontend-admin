// Query keys of the services reads that are not Refine resources (decision 005: they start with `['api', <feature>]`), and what
// a catalog change makes stale. React Query matches the keys as prefixes.
import type { QueryKey } from '@tanstack/react-query';
import { DASHBOARD_KEY, type InvalidateTarget } from '@/lib/query';

/** The service counts above the table: all services and the ones below their floor. */
export const SERVICE_COUNTS_KEY = ['api', 'services', 'counts'] as const;

/** The service menus (resolver, inventory filter, import and bulk dialogs). */
export const SERVICE_PICKER_KEY = ['api', 'services', 'picker'] as const;

/** Names for the group and merchant menus. */
export const SERVICE_LOOKUP_KEY = ['api', 'services', 'lookups'] as const;

/** The price resolutions, which any price, rule or group change can outdate. */
export const RESOLVE_KEY = ['api', 'services', 'resolve'] as const;

/**
 * The reads a price or catalog change makes stale besides Refine's own: the counts, the service menus, the resolutions,
 * and the dashboard (its "below floor" alert).
 */
export const SERVICE_STALE_KEYS: QueryKey[] = [
  SERVICE_COUNTS_KEY,
  SERVICE_PICKER_KEY,
  RESOLVE_KEY,
  DASHBOARD_KEY,
];

/** The Refine targets of changed services: every list, and each service's own record. */
export function staleServices(...ids: readonly number[]): InvalidateTarget[] {
  return [{ resource: 'services' }, ...ids.map((id) => ({ resource: 'services', id }))];
}

/**
 * The same, plus the category lists: creating, moving or deleting a service changes how many services a category holds
 * (`serviceCount`), which the Categories tab shows.
 */
export function staleServicesAndCategories(...ids: readonly number[]): InvalidateTarget[] {
  return [...staleServices(...ids), { resource: 'service-categories' }];
}

/** How many names one menu loads. A longer catalog would need a search box; the demo's menus were plain selects. */
export const PICKER_CAP = 200;

/** The five minutes a lookup is kept: the lists change rarely, and a menu should not wait for a request each time. */
export const LOOKUP_STALE_MS = 5 * 60_000;
