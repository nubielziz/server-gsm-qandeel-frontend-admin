// Mock of the report routes (`/admin/reports/profit`, `/wallet-exposure`, `/vat`): figures worked out from the mock orders, the
// shared ledger and the demo's storefront orders, in the shapes of the assumed contracts (MISMATCHES M124). Mock data only (decision 014).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { latency } from '@/mocks/latency';
import { orderStore } from '@/mocks/orders';
import { demoRows, loadDemoState, toMoney } from '@/mocks/seed';
import { guard } from '@/mocks/session';
import type { ProfitGroup, ProfitReport, ProfitRow, VatReport, VatRow } from '../types';
import { exposureOf } from './books';

// "2026-10-28" as the start of that day in local time, or the start of the next day for `endOfDay`.
function dayStart(date: string | null, endOfDay = false): number {
  const [year, month, day] = (date ?? '').split('-').map(Number);
  return new Date(year, month - 1, day + (endOfDay ? 1 : 0)).getTime();
}

const pad = (n: number) => String(n).padStart(2, '0');
const localDay = (ms: number) => {
  const date = new Date(ms);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

type Bucket = { key: string; label: string; orders: number; revenue: number; cost: number };

async function profitReport(groupBy: ProfitGroup, from: string, to: string): Promise<ProfitReport> {
  const start = dayStart(from);
  const end = dayStart(to, true);
  const buckets = new Map<string, Bucket>();
  for (const order of (await orderStore()).list()) {
    if (order.status !== 'completed' || !order.completedAt) continue;
    const at = Date.parse(order.completedAt);
    if (at < start || at >= end) continue;
    const group =
      groupBy === 'day'
        ? { key: localDay(at), label: localDay(at) }
        : groupBy === 'service'
          ? { key: String(order.service.id), label: order.service.name }
          : groupBy === 'supplier'
            ? { key: String(order.supplier?.id ?? 0), label: order.supplier?.name ?? 'No supplier' }
            : { key: String(order.client?.id ?? 0), label: order.client?.name ?? 'Storefront customers' };
    const bucket = buckets.get(group.key) ?? { ...group, orders: 0, revenue: 0, cost: 0 };
    bucket.orders += 1;
    bucket.revenue += Number(order.totalPrice);
    bucket.cost += Number(order.totalCost);
    buckets.set(group.key, bucket);
  }
  const rows: ProfitRow[] = [...buckets.values()]
    .map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      orders: bucket.orders,
      revenue: toMoney(bucket.revenue),
      cost: toMoney(bucket.cost),
      profit: toMoney(bucket.revenue - bucket.cost),
    }))
    // Days run oldest first; every other split ranks by profit.
    .sort((a, b) => (groupBy === 'day' ? a.key.localeCompare(b.key) : Number(b.profit) - Number(a.profit)));
  const all = [...buckets.values()];
  const revenue = all.reduce((sum, bucket) => sum + bucket.revenue, 0);
  const cost = all.reduce((sum, bucket) => sum + bucket.cost, 0);
  return {
    groupBy,
    from,
    to,
    currency: 'USD',
    rows,
    totals: {
      orders: all.reduce((sum, bucket) => sum + bucket.orders, 0),
      revenue: toMoney(revenue),
      cost: toMoney(cost),
      profit: toMoney(revenue - cost),
    },
  };
}

type DemoOrder = {
  cid?: string;
  status: string;
  price: number;
  tax?: number;
  taxRate?: number;
  country?: string;
  doneAt: number | null;
};

async function vatReport(from: string, to: string): Promise<VatReport> {
  const start = dayStart(from);
  const end = dayStart(to, true);
  const groups = new Map<string, VatRow & { net: number; vatSum: number }>();
  for (const order of demoRows<DemoOrder>(await loadDemoState(), 'orders')) {
    if (!order.cid || order.status !== 'completed' || !order.doneAt || !order.tax) continue;
    if (order.doneAt < start || order.doneAt >= end) continue;
    const period = localDay(order.doneAt).slice(0, 7);
    const country = order.country ?? '??';
    const key = `${country}-${period}`;
    const row = groups.get(key) ?? {
      country,
      period,
      rate: toMoney((order.taxRate ?? 0) * 100),
      orders: 0,
      taxable: '',
      vat: '',
      net: 0,
      vatSum: 0,
    };
    row.orders += 1;
    row.net += order.price;
    row.vatSum += order.tax;
    groups.set(key, row);
  }
  const all = [...groups.values()].sort(
    (a, b) => b.period.localeCompare(a.period) || a.country.localeCompare(b.country),
  );
  return {
    from,
    to,
    currency: 'USD',
    rows: all.map(({ net, vatSum, ...row }) => ({ ...row, taxable: toMoney(net), vat: toMoney(vatSum) })),
    totals: {
      orders: all.reduce((sum, row) => sum + row.orders, 0),
      taxable: toMoney(all.reduce((sum, row) => sum + row.net, 0)),
      vat: toMoney(all.reduce((sum, row) => sum + row.vatSum, 0)),
    },
  };
}

export const reportHandlers: HttpHandler[] = [
  http.get('*/admin/reports/profit', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const query = new URL(request.url).searchParams;
    const by = query.get('groupBy');
    const groupBy: ProfitGroup = by === 'service' || by === 'supplier' || by === 'client' ? by : 'day';
    return HttpResponse.json(await profitReport(groupBy, query.get('from') ?? '', query.get('to') ?? ''));
  }),

  http.get('*/admin/reports/wallet-exposure', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    return HttpResponse.json(await exposureOf());
  }),

  http.get('*/admin/reports/vat', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const query = new URL(request.url).searchParams;
    return HttpResponse.json(await vatReport(query.get('from') ?? '', query.get('to') ?? ''));
  }),
];
