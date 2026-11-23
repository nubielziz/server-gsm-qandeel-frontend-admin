// Query keys of the services reads that are not Refine resources (decision 005: they start with `['api', <feature>]`), and what
// a change of a service makes stale. React Query matches the keys as prefixes.
import type { QueryKey } from '@tanstack/react-query';
import { SERVICE_ROWS_KEY, DASHBOARD_KEY, LISTING_DETAILS_KEY, type InvalidateTarget } from '@/lib/query';

/** The service menus (resolver, inventory filter, import and bulk dialogs). */
export const SERVICE_PICKER_KEY = ['api', 'services', 'picker'] as const;

/** Names for the group and merchant menus. */
export const SERVICE_LOOKUP_KEY = ['api', 'services', 'lookups'] as const;

/** The price resolutions, which any price, rule or group change can outdate. */
export const RESOLVE_KEY = ['api', 'services', 'resolve'] as const;

/**
 * The reads a price or service change makes stale besides Refine's own: the table's rows and counts (the shared rows key), the
 * service menus, the resolutions, the dashboard (its "below floor" alert) and the listing reads. A listing prints the service's base
 * price and the shop floor, and it is kept for good, so an open shop price block would show the old ones after a price save.
 */
export const SERVICE_STALE_KEYS: QueryKey[] = [
  SERVICE_ROWS_KEY,
  SERVICE_PICKER_KEY,
  RESOLVE_KEY,
  DASHBOARD_KEY,
  LISTING_DETAILS_KEY,
];

/** The Refine targets of changed services: every list, and each service's own record. */
export function staleServices(...ids: readonly number[]): InvalidateTarget[] {
  return [{ resource: 'services' }, ...ids.map((id) => ({ resource: 'services', id }))];
}

/**
 * The same, plus the category lists: creating, moving or deleting a service changes how many services a category holds
 * (`serviceCount`), which the Group view shows.
 */
export function staleServicesAndCategories(...ids: readonly number[]): InvalidateTarget[] {
  return [...staleServices(...ids), { resource: 'service-categories' }];
}

/** How many names one menu loads. A longer list would need a search box; the demo's menus were plain selects. */
export const PICKER_CAP = 200;

/** The five minutes a lookup is kept: the lists change rarely, and a menu should not wait for a request each time. */
export const LOOKUP_STALE_MS = 5 * 60_000;
