// The two charts: orders created per service type (30 days and 12 months) and completed revenue per channel (30 days).
// Ports daily(), monthly() and dailyRevenue() of 11-state.js. Buckets are UTC calendar days and months.
import { toMoney } from '@/mocks/seed';
import type { ChannelRevenue, DashboardScope, OrdersByType, TypeCounts } from '../types';
import { createdAt, inScope } from './orderRules';
import { DAY, dayKey, dayStart, lastDays, lastMonths, sumBy } from './util';
import type { World } from './world';

const empty = (): TypeCounts => ({ imei: 0, server: 0, remote: 0, file: 0 });

/** Orders created per day for 30 days, and per month for 12 months (null for the storefront alone: it has no yearly history). */
export function ordersByType(world: World, scope: DashboardScope): OrdersByType {
  const days = lastDays(world.now, 30);
  const rows = days.map((day) => ({ date: dayKey(day), ...empty() }));
  for (const order of world.orders) {
    if (!inScope(order, scope)) continue;
    const row = rows[(dayStart(createdAt(order)) - days[0]) / DAY];
    if (row) row[order.service.type] += 1;
  }
  if (scope === 'b2c') return { daily: rows, monthly: null };

  const months = lastMonths(world.now, 12);
  const history = world.monthly.slice(-months.length);
  const monthly = months.map((month, index) => {
    const seed = history[index - (months.length - history.length)];
    return {
      month,
      imei: seed?.IMEI ?? 0,
      server: seed?.Server ?? 0,
      remote: seed?.Remote ?? 0,
      file: seed?.File ?? 0,
    };
  });
  // The demo folds the storefront's last 30 days into the newest month when it shows everything.
  if (scope === 'all') {
    const latest = monthly[monthly.length - 1];
    for (const order of world.orders) {
      if (order.channel === 'b2c' && world.now - createdAt(order) < 30 * DAY) latest[order.service.type] += 1;
    }
  }
  return { daily: rows, monthly };
}

/** Completed-order revenue before VAT per day for 30 days, split merchants and storefront, with the 7 and 30 day totals. */
export function revenueByChannel(world: World): ChannelRevenue {
  const days = lastDays(world.now, 30);
  const rows = days.map((day) => ({ date: dayKey(day), b2b: 0, b2c: 0 }));
  for (const order of world.orders) {
    if (order.status !== 'completed' || !order.completedAt) continue;
    const row = rows[(dayStart(Date.parse(order.completedAt)) - days[0]) / DAY];
    if (row) row[order.channel] += Number(order.totalPrice);
  }
  const totals = (from: number) => ({
    b2b: toMoney(sumBy(rows.slice(from), (row) => row.b2b)),
    b2c: toMoney(sumBy(rows.slice(from), (row) => row.b2c)),
  });
  return {
    daily: rows.map((row) => ({ date: row.date, b2b: toMoney(row.b2b), b2c: toMoney(row.b2c) })),
    totals: { last7Days: totals(-7), last30Days: totals(0) },
  };
}
