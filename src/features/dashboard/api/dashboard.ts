// The dashboard routes: the figures page, the top accounts list and the queue monitor link. Ports the data behind
// `pageDashboard` in 40-p-dashboard.js (the demo computed everything from its in-memory state; the server does it here).
import { apiGet, apiUrl } from '@/lib/api';
import type { Dashboard, DashboardParams, TopAccount, TopClientsParams } from '../types';

/**
 * The kinds of "Needs attention" rows whose feature the console retired: `merchants_pending` (merchants waiting for approval;
 * staff-made accounts are active at once) and `commissions_accrued` (the Commissions page). A server that is not updated yet may
 * still send them: the console drops them, so no row with a neutral title and no way to act on it shows.
 */
export const RETIRED_ATTENTION_KINDS: ReadonlySet<string> = new Set([
  'merchants_pending',
  'commissions_accrued',
]);

/**
 * Everything the dashboard page shows in one call: the key figures with the previous period, the attention list, the
 * queues, supplier health, the charts, the storefront funnel and the numbers for the sidebar. `scope`
 * separates merchants from the storefront (the map); `days` is the period of the figures. One call keeps all panels
 * from the same moment, and the sidebar counts share it. The old `navCounts.merchants` count is ignored when an older server still
 * sends it.
 * Assumed contract: the response is a `Dashboard` and `days` is 1, 7 or 14 (the map names `scope` only). Rows of a retired
 * kind (`RETIRED_ATTENTION_KINDS`) are taken out of `attention`; everything else stays as the server sent it.
 * @route GET /admin/dashboard
 */
export async function getDashboard(params: DashboardParams, signal?: AbortSignal): Promise<Dashboard> {
  const dashboard = await apiGet<Dashboard>(
    '/admin/dashboard',
    { scope: params.scope, days: params.days },
    { signal },
  );
  return {
    ...dashboard,
    attention: dashboard.attention.filter((item) => !RETIRED_ATTENTION_KINDS.has(item.kind)),
  };
}

/**
 * The accounts that bought most over the period, for the dashboard's "Top accounts" list: merchants and storefront buyers
 * (guests too) in one ranking. `scope` is the door the orders came through, as on the rest of the dashboard. It is a separate
 * report with its own permission (`reports:read`), so the dashboard asks for it only when the staff member has it.
 * Assumed contract: query `days`, `limit` and `scope`, an array of `TopAccount` ranked by spend, highest first.
 * @route GET /admin/reports/top-clients
 */
export function getTopClients(params: TopClientsParams, signal?: AbortSignal): Promise<TopAccount[]> {
  return apiGet<TopAccount[]>(
    '/admin/reports/top-clients',
    { days: params.days, limit: params.limit, scope: params.scope },
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
