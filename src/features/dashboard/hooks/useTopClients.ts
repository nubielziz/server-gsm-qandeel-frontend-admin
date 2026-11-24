// The top accounts list as a query. Ports the data side of topMerchantsPanel() in 40-p-dashboard.js (merStats there); the list now holds every
// account that ordered through the door of the dashboard's channel.
import { DASHBOARD_KEY, useApiQuery } from '@/lib/query';
import { getTopClients } from '../api';
import type { DashboardDays, DashboardScope } from '../types';
import { REFRESH_MS, STALE_MS } from './useDashboard';

/** Accounts in the list (the demo's `slice(0, 6)`). */
export const TOP_CLIENTS_LIMIT = 6;

/**
 * The best-spending accounts of the period in the channel shown. It lives under `DASHBOARD_KEY`, so whatever refreshes the dashboard
 * refreshes this too; the channel is part of the key, so another channel is another list. Render the panel only for staff with
 * `reports:read`; the server refuses the call otherwise.
 */
export function useTopClients(days: DashboardDays, scope: DashboardScope) {
  return useApiQuery({
    queryKey: [...DASHBOARD_KEY, 'top-clients', { days, scope, limit: TOP_CLIENTS_LIMIT }],
    queryFn: ({ signal }) => getTopClients({ days, scope, limit: TOP_CLIENTS_LIMIT }, signal),
    refetchInterval: REFRESH_MS,
    staleTime: STALE_MS,
  });
}
