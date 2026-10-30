// The storefront funnel with its small figures, and the top customers, for the dev mock. Ports the numbers of storefrontPanel()
// and topCustomersPanel() in 40-p-dashboard.js and supportStats() of 12-state-b2c.js. The real server counts these.
import { demoNumericId, toMoney } from '@/mocks/seed';
import type { StorefrontSummary, TopCustomer } from '../types';
import { createdAt, isHeld } from './orderRules';
import { DAY, median, sumBy } from './util';
import type { World } from './world';

// What the customer paid: the order's price and its VAT.
const gross = (order: { totalPrice: string; taxAmount: string }): number =>
  Number(order.totalPrice) + Number(order.taxAmount);

/** The last 30 days of the storefront: the funnel, then the rates under it. */
export function storefrontSummary(world: World): StorefrontSummary {
  const since = world.now - 30 * DAY;
  const orders = world.orders.filter((order) => order.channel === 'b2c' && createdAt(order) >= since);
  const checks = world.imeiChecks.filter((check) => check.ts >= since).length;
  const abandoned = world.checkouts.filter((checkout) => checkout.created >= since).length;
  const paid = orders.filter((order) => order.status !== 'rejected');
  const sales = sumBy(paid, gross);
  const refunded = sumBy(
    world.refunds.filter((refund) => refund.status === 'completed' && refund.created >= since),
    (refund) => refund.amount,
  );
  const disputes = world.disputes.filter((dispute) => dispute.opened >= since).length;
  const firstReply = median(
    world.tickets.flatMap((ticket) => (ticket.firstReplyAt ? [ticket.firstReplyAt - ticket.created] : [])),
  );
  const ratings = world.tickets.flatMap((ticket) => (ticket.csat ? [ticket.csat] : []));
  return {
    funnel: {
      // Visitors are guessed from IMEI checks, as the demo does.
      visitorsEstimated: Math.round(checks * 5.6),
      imeiChecks: checks,
      checkoutsStarted: orders.length + abandoned,
      paid: orders.length,
      delivered: orders.filter((order) => order.status === 'completed').length,
    },
    averageOrder: paid.length ? toMoney(sales / paid.length) : null,
    refundRate: sales ? (refunded / sales) * 100 : null,
    disputeRate: orders.length ? (disputes / orders.length) * 100 : null,
    firstReplySeconds: firstReply === null ? null : firstReply / 1000,
    satisfaction: ratings.length
      ? { average: sumBy(ratings, (r) => r) / ratings.length, ratings: ratings.length }
      : null,
    heldForReview: world.orders.filter(isHeld).length,
  };
}

/** The five storefront customers who spent most over the last `days` days (rejected orders do not count). */
export function topCustomers(world: World, days: number): TopCustomer[] {
  const since = world.now - days * DAY;
  const known = new Map(world.customers.map((customer) => [demoNumericId(customer.id), customer]));
  const totals = new Map<number, { orders: number; spend: number }>();
  for (const order of world.orders) {
    if (order.channel !== 'b2c' || !order.customer || order.status === 'rejected') continue;
    if (createdAt(order) < since) continue;
    const entry = totals.get(order.customer.id) ?? { orders: 0, spend: 0 };
    entry.orders += 1;
    entry.spend += gross(order);
    totals.set(order.customer.id, entry);
  }
  return [...totals]
    .map(([id, total]) => ({
      id,
      name: known.get(id)?.name ?? unknownName(id),
      country: known.get(id)?.country ?? '',
      orders: total.orders,
      spend: toMoney(total.spend),
    }))
    .sort((a, b) => Number(b.spend) - Number(a.spend))
    .slice(0, 5);
}

// A customer the seed does not know (it cannot happen with the demo data).
const unknownName = (id: number): string => `Customer ${id}`;
