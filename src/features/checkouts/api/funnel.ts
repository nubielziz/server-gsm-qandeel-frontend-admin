// The sales funnel (`GET /admin/reports/funnel`): the new Funnel panel of the checkouts page. The demo had the funnel only on the
// dashboard (storefrontPanel in 40-p-dashboard.js); the map gives it its own report (MISMATCHES M39).
import { apiGet, type ApiInit } from '@/lib/api';
import type { FunnelQuery, FunnelReport } from '../types';

/**
 * How many people reached each step in the last `days` days (30 when left out): checked an IMEI, started a payment, paid, got
 * their order delivered. The server counts every step; the console formats them and shows each step's share of the one before.
 * Assumed contract: query `days`, answer `{ days, imeiChecks, paymentStarted, paid, delivered }`.
 * @route GET /admin/reports/funnel
 */
export function getFunnel(query: FunnelQuery = {}, init?: ApiInit): Promise<FunnelReport> {
  return apiGet<FunnelReport>('/admin/reports/funnel', query, init);
}
