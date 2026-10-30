// The dashboard routes: the figures page, the top merchants list and the queue monitor link. Ports the data behind
// `pageDashboard` in 40-p-dashboard.js (the demo computed everything from its in-memory state; the server does it here).
import { apiGet, apiUrl } from '@/lib/api';
import type { Dashboard, DashboardParams, TopClient, TopClientsParams } from '../types';

/**
 * Everything the dashboard page shows in one call: the key figures with the previous period, the attention list, the
 * queues, supplier health, the charts, the storefront funnel, the top customers and the numbers for the sidebar. `scope`
 * separates merchants from the storefront (the map); `days` is the period of the figures. One call keeps all panels
 * from the same moment, and the sidebar counts share it.
 * Assumed contract: the response is a `Dashboard` and `days` is 1, 7 or 14 (the map names `scope` only).
 * @route GET /admin/dashboard
 */
export function getDashboard(params: DashboardParams, signal?: AbortSignal): Promise<Dashboard> {
  return apiGet<Dashboard>('/admin/dashboard', { scope: params.scope, days: params.days }, { signal });
}

/**
 * The merchants that bought most over the period, for the dashboard's "Top merchants" list. It is a separate report
 * with its own permission (`reports:read`), so the dashboard asks for it only when the staff member has it.
 * Assumed contract: query `days` and `limit`, an array of `TopClient` ranked by spend, highest first.
 * @route GET /admin/reports/top-clients
 */
export function getTopClients(params: TopClientsParams, signal?: AbortSignal): Promise<TopClient[]> {
  return apiGet<TopClient[]>(
    '/admin/reports/top-clients',
    { days: params.days, limit: params.limit },
    { signal },
  );
}

/**
 * The address of the queue monitor (Bull Board). This route serves a web page, not JSON, so the console never fetches
 * it: the dashboard links to it and the browser opens it in a new tab (MISMATCHES M8).
 * @route GET /admin/queues
 */
export function queuesBoardUrl(): string {
  return apiUrl('/admin/queues');
}
