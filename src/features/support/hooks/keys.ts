// Query keys of the support reads that are not Refine resources (decision 005: they start with `['api', <feature>]`). A
// mutation lists the keys it makes stale; React Query matches them as prefixes.
import { DASHBOARD_KEY } from '@/lib/query';
import type { QueryKey } from '@tanstack/react-query';

/** The figures above the inbox: open, not yet answered and past the reply target. */
export const SUPPORT_COUNTS_KEY = ['api', 'support', 'counts'] as const;

/** How often the inbox, the open thread and the counts ask again while the page is open (customers write by themselves). */
export const REFRESH_MS = 30_000;

/**
 * The reads a ticket change makes stale besides Refine's own lists and details: the figures above the inbox, and the
 * dashboard with the sidebar's ticket count.
 */
export const TICKET_STALE_KEYS: QueryKey[] = [SUPPORT_COUNTS_KEY, DASHBOARD_KEY];
