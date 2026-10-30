// The top merchants list as a query. Ports the data side of topMerchantsPanel() in 40-p-dashboard.js (merStats there).
import { DASHBOARD_KEY, useApiQuery } from '@/lib/query';
import { getTopClients } from '../api';
import type { DashboardDays } from '../types';
import { REFRESH_MS, STALE_MS } from './useDashboard';

/** Merchants in the list (the demo's `slice(0, 6)`). */
export const TOP_CLIENTS_LIMIT = 6;

/**
 * The best-spending merchants of the period. It lives under `DASHBOARD_KEY`, so whatever refreshes the dashboard
 * refreshes this too. Render the panel only for staff with `reports:read`; the server refuses the call otherwise.
 */
export function useTopClients(days: DashboardDays) {
  return useApiQuery({
    queryKey: [...DASHBOARD_KEY, 'top-clients', { days, limit: TOP_CLIENTS_LIMIT }],
    queryFn: ({ signal }) => getTopClients({ days, limit: TOP_CLIENTS_LIMIT }, signal),
    refetchInterval: REFRESH_MS,
    staleTime: STALE_MS,
  });
}
