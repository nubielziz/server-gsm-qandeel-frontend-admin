// The key figures of a period and the one before it. Ports statsFor() and periodStats() of 11-state.js: revenue and
// profit of completed orders, order count, success rate and median turnaround of the orders created in the window.
import type { MockOrder } from '@/mocks/orders';
import { toMoney } from '@/mocks/seed';
import type { Dashboard, DashboardDays, DashboardScope, PeriodStats } from '../types';
import { createdAt, inScope } from './orderRules';
import { DAY, median, sumBy } from './util';
import type { World } from './world';

// The five figures of the orders created in one window.
function figures(orders: MockOrder[]): PeriodStats {
  const done = orders.filter((order) => order.status === 'completed');
  const rejected = orders.filter((order) => order.status === 'rejected');
  const revenue = sumBy(done, (order) => Number(order.totalPrice));
  const cost = sumBy(done, (order) => Number(order.totalCost));
  const turnaround = done.map((order) => Date.parse(order.completedAt ?? '') - createdAt(order));
  const middle = median(turnaround.filter(Number.isFinite));
  return {
    revenue: toMoney(revenue),
    profit: toMoney(revenue - cost),
    orders: orders.length,
    successRate: done.length + rejected.length ? (done.length / (done.length + rejected.length)) * 100 : null,
    medianTurnaroundSeconds: middle === null ? null : middle / 1000,
  };
}

/** The figures for the last `days` days and for the same length before; `previous` is null when no order exists there. */
export function periodStats(world: World, scope: DashboardScope, days: DashboardDays): Dashboard['stats'] {
  const span = days * DAY;
  const inWindow = (from: number, to: number) =>
    world.orders.filter(
      (order) => inScope(order, scope) && createdAt(order) >= from && createdAt(order) < to,
    );
  const current = inWindow(world.now - span, world.now + 1);
  const earlier = inWindow(world.now - 2 * span, world.now - span);
  return { current: figures(current), previous: earlier.length ? figures(earlier) : null };
}
