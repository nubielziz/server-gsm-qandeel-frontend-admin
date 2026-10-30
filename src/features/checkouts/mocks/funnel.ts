// The funnel the mock works out for `GET /admin/reports/funnel`: IMEI checks, payments started, paid and delivered in the last
// `days` days. Ports the numbers of storefrontPanel() in 40-p-dashboard.js (started = storefront orders + abandoned checkouts).
// The real server counts these (decision 014).
import { orderStore } from '@/mocks/orders';
import type { FunnelReport } from '../types';
import type { CheckoutsState } from './store';

const DAY = 86_400_000;

/** Counts the steps for the last `days` days from the live order store and the checkout tables. */
export async function buildFunnel(
  state: CheckoutsState,
  days: number,
  now = Date.now(),
): Promise<FunnelReport> {
  const since = now - days * DAY;
  const orders = (await orderStore())
    .list()
    .filter((order) => order.channel === 'b2c' && Date.parse(order.createdAt) >= since);
  const abandoned = state.checkouts
    .list()
    .filter((checkout) => Date.parse(checkout.createdAt) >= since).length;
  return {
    days,
    imeiChecks: state.imeiChecks.filter((ts) => ts >= since).length,
    paymentStarted: orders.length + abandoned,
    paid: orders.length,
    delivered: orders.filter((order) => order.status === 'completed').length,
  };
}
