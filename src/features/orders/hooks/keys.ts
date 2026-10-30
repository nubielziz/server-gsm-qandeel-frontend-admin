// Query keys of the order reads that are not Refine resources (decision 005: they start with `['api', <feature>]`), and
// what an order action makes stale. React Query matches the keys as prefixes.
import type { QueryKey } from '@tanstack/react-query';
import { DASHBOARD_KEY, type InvalidateTarget } from '@/lib/query';

/** The timeline of each order. */
export const ORDER_EVENTS_KEY = ['api', 'orders', 'events'] as const;

/** The tab counts and the "past SLA" figure. */
export const ORDER_COUNTS_KEY = ['api', 'orders', 'counts'] as const;

/** The ledger entries of each order (the money trail). */
export const ORDER_LEDGER_KEY = ['api', 'orders', 'ledger'] as const;

/** Names for the filter menus and the reroute menu. */
export const ORDER_LOOKUP_KEY = ['api', 'orders', 'lookups'] as const;

/**
 * The reads an order action makes stale besides Refine's own: the timeline, the counts, the ledger entries, and the
 * dashboard with the sidebar counts.
 */
export const ORDER_STALE_KEYS: QueryKey[] = [
  ORDER_EVENTS_KEY,
  ORDER_COUNTS_KEY,
  ORDER_LEDGER_KEY,
  DASHBOARD_KEY,
];

/**
 * The Refine targets of changed orders: every list, and each order's own record (Refine refreshes a single record only
 * when told its id). Action hooks pass this to `useApiMutation` with `ORDER_STALE_KEYS`.
 */
export function staleOrders(...ids: readonly number[]): InvalidateTarget[] {
  return ids.map((id) => ({ resource: 'orders', id }));
}

/** How often the list and the counts ask again while the page is open (the queue changes by itself). */
export const REFRESH_MS = 30_000;
