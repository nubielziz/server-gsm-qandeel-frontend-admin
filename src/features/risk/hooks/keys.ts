// Query keys of the risk reads that are not Refine resources (decision 005: they start with `['api', <feature>]`), and what a
// decision makes stale. React Query matches the keys as prefixes.
import type { QueryKey } from '@tanstack/react-query';
import { DASHBOARD_KEY } from '@/lib/query';

/** `GET /admin/risk/queue`: the held orders, the strip's figures and the latest decisions. */
export const RISK_QUEUE_KEY = ['api', 'risk', 'queue'] as const;

/** `GET /admin/risk/rules`. */
export const RISK_RULES_KEY = ['api', 'risk', 'rules'] as const;

/** The figures above the IMEI check table: one counted call each (`_start=0&_end=1`). */
export const IMEI_COUNTS_KEY = ['api', 'risk', 'imei-counts'] as const;

/** The number on the Blocklist tab. */
export const BLOCK_COUNT_KEY = ['api', 'risk', 'blocklist-count'] as const;

/**
 * The reads a decision on a held order makes stale besides Refine's own lists: the queue, the Blocklist count (a refund can
 * add entries), the orders feature's reads of the order (timeline, counts, ledger: they all start with `['api', 'orders']`)
 * and the dashboard with the sidebar's held count.
 */
export const DECISION_STALE_KEYS: QueryKey[] = [
  RISK_QUEUE_KEY,
  BLOCK_COUNT_KEY,
  ['api', 'orders'],
  DASHBOARD_KEY,
];

/** How often the queue and the counts ask again while the page is open (a new held order should show up by itself). */
export const REFRESH_MS = 30_000;
