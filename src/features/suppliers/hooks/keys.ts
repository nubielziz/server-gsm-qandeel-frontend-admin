// Query keys of the supplier reads that are not Refine resources (decision 005: they start with `['api', <feature>]`), how
// often the page asks again, and what a supplier action makes stale. React Query matches keys as prefixes.
import type { QueryKey } from '@tanstack/react-query';
import type { Id } from '@/lib/api';
import { DASHBOARD_KEY, type InvalidateTarget } from '@/lib/query';

/** A supplier's own service list (the import dialog, the links editor). */
export const SUPPLIER_CATALOGUE_KEY = ['api', 'suppliers', 'catalogue'] as const;

/** The supplier report behind the figures under the stats. */
export const SUPPLIER_REPORT_KEY = ['api', 'suppliers', 'report'] as const;

/** The open orders of a supplier, listed by the reroute dialog. */
export const SUPPLIER_ORDERS_KEY = ['api', 'suppliers', 'open-orders'] as const;

/** How often the list and the open supplier ask again while the page is open: health and balances change by themselves. */
export const REFRESH_MS = 30_000;

/** The Refine targets of a changed supplier: the lists, and its own record (the detail is refreshed only when told its id). */
export function staleSupplier(id?: Id): InvalidateTarget[] {
  return [{ resource: 'suppliers', id }];
}

/** The same for an action that makes a call to the supplier (test, sync, a reroute): the API log has new rows. */
export function staleLogged(id?: Id): InvalidateTarget[] {
  return [...staleSupplier(id), { resource: 'supplier-api-logs' }];
}

/** The other reads a supplier action makes stale: the dashboard's supplier health and alerts, and the report. */
export const SUPPLIER_STALE_KEYS: QueryKey[] = [DASHBOARD_KEY, SUPPLIER_REPORT_KEY];
