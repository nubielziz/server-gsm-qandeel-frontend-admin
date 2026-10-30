// The sidebar counts for the dev mock, over the whole console whatever the scope. Ports the `badges` of renderNav() in 90-app.js
// (the demo's Finance count also added withdrawal requests, which have no admin route: MISMATCHES M3).
import type { DashboardNavCounts } from '../types';
import { isHeld, isOpen, isPastSla } from './orderRules';
import { supportCounts } from './support';
import { DAY } from './util';
import type { World } from './world';

/** The six sidebar counts over every order and ticket, whatever the dashboard's channel. */
export function navCounts(world: World): DashboardNavCounts {
  const open = world.orders.filter(isOpen);
  const refunds = world.refunds.filter(
    (refund) => refund.status === 'requested' || refund.status === 'failed',
  );
  const disputes = world.disputes.filter((dispute) => dispute.status === 'needs_response');
  return {
    orders: { open: open.length, pastSla: open.filter((order) => isPastSla(order, world.now)).length },
    finance: { pendingDeposits: world.payments.filter((payment) => payment.status === 'pending').length },
    merchants: {
      pendingApproval: world.merchants.filter((merchant) => merchant.status === 'pending').length,
    },
    support: supportCounts(world),
    refunds: {
      open: refunds.length + disputes.length,
      disputesDueSoon: disputes.filter((dispute) => dispute.due - world.now < 3 * DAY).length,
    },
    risk: { held: world.orders.filter(isHeld).length },
  };
}
