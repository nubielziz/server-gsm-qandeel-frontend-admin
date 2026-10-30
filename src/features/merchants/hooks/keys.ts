// Query keys of the merchant reads that are not Refine resources (decision 005: they start with `['api', <feature>]`), and what
// a change to a merchant makes stale. React Query matches the keys as prefixes.
import type { QueryKey } from '@tanstack/react-query';
import { DASHBOARD_KEY, type InvalidateTarget, MERCHANT_WALLET_KEY } from '@/lib/query';

/** The numbers on the tabs (one call each, `_start=0&_end=1`). */
export const MERCHANT_COUNTS_KEY = ['api', 'merchants', 'counts'] as const;

/** The wallet figures of each merchant. */
export const WALLET_KEY = MERCHANT_WALLET_KEY;

/** The statement rows of each merchant (every page and sort). */
export const STATEMENT_KEY = ['api', 'merchants', 'statement'] as const;

/** The API keys of each merchant. */
export const API_KEYS_KEY = ['api', 'merchants', 'api-keys'] as const;

/** The journal entries behind the statement's "View journal" button. */
export const JOURNAL_KEY = ['api', 'merchants', 'journal'] as const;

/** The services behind the Add override menu. */
export const SERVICE_LOOKUP_KEY = ['api', 'merchants', 'lookups', 'services'] as const;

/** How often the merchant table and its counts ask again while the page is open (approvals arrive by themselves). */
export const REFRESH_MS = 30_000;

/** Most rows of a list that is read whole (groups, one merchant's prices). */
export const LIST_CAP = 200;

/**
 * The reads a change of a merchant's status or verification makes stale besides Refine's own: the tab counts, and the
 * dashboard with the sidebar's pending-merchants count.
 */
export const CLIENT_STALE_KEYS: QueryKey[] = [MERCHANT_COUNTS_KEY, DASHBOARD_KEY];

/** The Refine targets of a changed merchant: every list, and its own record (Refine refreshes a record only when told its id). */
export function staleClient(id?: number): InvalidateTarget[] {
  return [{ resource: 'clients', id }];
}
