// The sidebar counts from the dashboard payload. Ports the `badges` object of renderNav() in 90-app.js.
import type { NavCounts } from '@/app/layout/useNavCounts';
import type { DashboardNavCounts } from '../types';

/**
 * Maps the payload's counts to the sidebar's: the number chip, plus the red dot where some of the items are late. A
 * count of zero is left out, so the sidebar shows nothing for an empty queue (the demo's `b && b[0]`).
 */
export function toNavCounts(counts: DashboardNavCounts): NavCounts {
  const out: NavCounts = {};
  const put = (page: string, count: number, late = 0, lateLabel?: string) => {
    if (count > 0) out[page] = { count, ...(late > 0 ? { late } : {}), ...(lateLabel ? { lateLabel } : {}) };
  };
  put('orders', counts.orders.open, counts.orders.pastSla);
  put('finance', counts.finance.pendingDeposits);
  put('merchants', counts.merchants.pendingApproval);
  put('support', counts.support.open, counts.support.late, 'past the reply target');
  put('refunds', counts.refunds.open, counts.refunds.disputesDueSoon, 'dispute deadlines within 3 days');
  put('risk', counts.risk.held);
  return out;
}
