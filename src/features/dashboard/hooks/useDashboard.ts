// The dashboard payload as a query. The page and the sidebar counts read the same key (`scope: all, days: 7`), so they
// share one request. Ports the data side of pageDashboard (40-p-dashboard.js).
import { DASHBOARD_KEY, useApiQuery } from '@/lib/query';
import { getDashboard } from '../api';
import type { DashboardParams } from '../types';

/** How often the dashboard asks again while it is open: the queues and counts change by themselves. */
export const REFRESH_MS = 60_000;

/**
 * How long an answer counts as fresh. Without it a page that mounts right after the sidebar's call would ask again at
 * once for the same numbers; with it they share one request. Order actions still refresh it through `DASHBOARD_KEY`.
 */
export const STALE_MS = 15_000;

export type DashboardQueryOptions = {
  /** False until the staff member's permissions are known to allow the call. */
  enabled?: boolean;
  /** `false` turns the polling off. */
  refetchInterval?: number | false;
};

/**
 * The dashboard for a channel and a period. The key starts with the shared `DASHBOARD_KEY`, so an order action that
 * invalidates it refreshes the page and the sidebar counts at once. A new channel or period keeps showing the last
 * answer (the query client's `placeholderData`) until the next one arrives.
 */
export function useDashboard(params: DashboardParams, options: DashboardQueryOptions = {}) {
  const { enabled = true, refetchInterval = REFRESH_MS } = options;
  return useApiQuery({
    queryKey: [...DASHBOARD_KEY, { scope: params.scope, days: params.days }],
    queryFn: ({ signal }) => getDashboard(params, signal),
    enabled,
    refetchInterval,
    staleTime: STALE_MS,
  });
}
