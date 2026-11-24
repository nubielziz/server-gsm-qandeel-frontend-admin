// Mock of the sales funnel (`GET /admin/reports/funnel`): payments started, paid and delivered in the last `days` days, counted from the
// live order store and the demo's abandoned checkouts (started = storefront orders + abandoned checkouts, as the dashboard's storefront
// funnel does). The real server counts these (decision 014).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { invalid } from '@/mocks/handlers/accessShared';
import { latency } from '@/mocks/latency';
import { orderStore } from '@/mocks/orders';
import { demoRows, loadDemoState } from '@/mocks/seed';
import { guard } from '@/mocks/session';
import type { FunnelReport } from '../types';

const DAY = 86_400_000;

/** The periods the report offers, in days. */
const PERIODS = [7, 30, 90];

/** Counts the steps for the last `days` days. */
export async function buildFunnel(days: number, now = Date.now()): Promise<FunnelReport> {
  const since = now - days * DAY;
  const orders = (await orderStore())
    .list()
    .filter((order) => order.channel === 'b2c' && Date.parse(order.createdAt) >= since);
  const abandoned = demoRows<{ created: number }>(await loadDemoState(), 'checkouts').filter(
    (checkout) => checkout.created >= since,
  ).length;
  return {
    days,
    paymentStarted: orders.length + abandoned,
    paid: orders.length,
    delivered: orders.filter((order) => order.status === 'completed').length,
  };
}

export const funnelHandlers: HttpHandler[] = [
  http.get('*/admin/reports/funnel', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const days = Number(new URL(request.url).searchParams.get('days') ?? 30);
    if (!PERIODS.includes(days)) {
      return invalid([{ field: 'days', message: `Use one of ${PERIODS.join(', ')}.` }]);
    }
    return HttpResponse.json(await buildFunnel(days));
  }),
];
