// The storefront funnel with its small figures, for the dev mock. Ports the numbers of storefrontPanel() in 40-p-dashboard.js and
// supportStats() of 12-state-b2c.js. The real server counts these. (The best buyers are not here: the Top accounts report has them.)
import { toMoney } from '@/mocks/seed';
import type { StorefrontSummary } from '../types';
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
  return {
    funnel: {
      // Visitors are guessed from the checkouts started (about five and a half visitors for each), as the demo guessed them.
      visitorsEstimated: Math.round((orders.length + abandoned) * 5.6),
      checkoutsStarted: orders.length + abandoned,
      paid: orders.length,
      delivered: orders.filter((order) => order.status === 'completed').length,
    },
    averageOrder: paid.length ? toMoney(sales / paid.length) : null,
    refundRate: sales ? (refunded / sales) * 100 : null,
    disputeRate: orders.length ? (disputes / orders.length) * 100 : null,
    firstReplySeconds: firstReply === null ? null : firstReply / 1000,
    heldForReview: world.orders.filter(isHeld).length,
  };
}
