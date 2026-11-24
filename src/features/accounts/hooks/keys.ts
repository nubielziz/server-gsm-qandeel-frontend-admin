// Query keys of the account reads that are not Refine resources (decision 005: they start with `['api', <feature>]`), and what a change
// to an account makes stale. React Query matches the keys as prefixes.
import type { QueryKey } from '@tanstack/react-query';
import { ACCOUNT_WALLET_KEY, type InvalidateTarget } from '@/lib/query';

/** The numbers of the strip and the status menu (one call, `GET /admin/clients/counts`). */
export const ACCOUNT_COUNTS_KEY = ['api', 'accounts', 'counts'] as const;

/** The open data requests, counted for the Data requests link (one call, `_start=0&_end=1`). */
export const REQUEST_COUNT_KEY = ['api', 'accounts', 'request-count'] as const;

/**
 * The wallet figures of each account. The finance feature invalidates the same prefix (`ACCOUNT_WALLET_KEY` of `@/lib/query`) when a
 * top-up is approved, so keep the two in step by importing the shared key, never by copying it.
 */
export const WALLET_KEY = ACCOUNT_WALLET_KEY;

/** The statement rows of each account's wallet (every page, sort and date range). */
export const STATEMENT_KEY = ['api', 'accounts', 'statement'] as const;

/** The journal entries behind the statement's "View journal" button. */
export const JOURNAL_KEY = ['api', 'accounts', 'journal'] as const;

/** The API keys of each account. */
export const API_KEYS_KEY = ['api', 'accounts', 'api-keys'] as const;

/** The privacy facts (consents, risk) of each account. */
export const PRIVACY_KEY = ['api', 'accounts', 'privacy'] as const;

/** One account's payments (the Payments part). */
export const PAYMENTS_KEY = ['api', 'accounts', 'payments'] as const;

/** The services behind the fixed-price menu. */
export const SERVICE_LOOKUP_KEY = ['api', 'accounts', 'lookups', 'services'] as const;

/** How often the list and its counts ask again while the page is open (new accounts arrive by themselves). */
export const REFRESH_MS = 30_000;

/** Most rows of a list that is read whole (ranks, one account's fixed prices). */
export const LIST_CAP = 200;

/** The reads a change of an account's status, rank or login makes stale besides Refine's own: the counts. */
export const ACCOUNT_STALE_KEYS: QueryKey[] = [ACCOUNT_COUNTS_KEY];

/** The reads a change of a data request makes stale besides Refine's own: the open count of the link, and the account counts. */
export const REQUEST_STALE_KEYS: QueryKey[] = [REQUEST_COUNT_KEY, ACCOUNT_COUNTS_KEY];

/**
 * The Refine targets of a changed account: every list, and its own record (Refine refreshes a record only when told its id). The
 * record carries the rank, the status and the sign-in facts, so one target covers them.
 */
export function staleAccount(id?: number): InvalidateTarget[] {
  return [{ resource: 'clients', id }];
}
