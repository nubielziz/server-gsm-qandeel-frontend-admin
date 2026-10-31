// Overall status and component checks of the System health page: `GET /admin/system/health` and
// `GET /admin/system/checks`. No demo page (design: docs/system-health-design.md); the map gives no bodies, so the
// shapes are assumed contracts.
import { apiGet, type ApiInit } from '@/lib/api';
import type { ChecksQuery, ChecksResponse, SystemHealth } from '../types';

/**
 * The one summary the verdict, the KPI row, the Overview tab and the shell banner read: overall status, the running
 * build, every component, uptime, open alerts, ongoing incidents and the maintenance state. The server works out every
 * status; the console only shows it, so a read that fails is shown as "Status unavailable", never as healthy.
 * Assumed contract: answer `SystemHealth`; no query.
 * @route GET /admin/system/health
 */
export function getSystemHealth(init?: ApiInit): Promise<SystemHealth> {
  return apiGet<SystemHealth>('/admin/system/health', undefined, init);
}

/**
 * The check history of one component, or of every component, over a range: the uptime bars and the response time line.
 * Read in one call for the Overview list and again for the component picked on the chart.
 * Assumed contract: query `range` (`1h`, `6h`, `24h` or `7d`) and an optional `component` (a key from
 * `getSystemHealth`, such as `postgres` or `supplier:3`); answer `ChecksResponse`.
 * @route GET /admin/system/checks
 */
export function getChecks(query: ChecksQuery, init?: ApiInit): Promise<ChecksResponse> {
  return apiGet<ChecksResponse>(
    '/admin/system/checks',
    { range: query.range, component: query.component },
    init,
  );
}
