// The sidebar counts from the dashboard payload. Ports the `badges` object of renderNav() in 90-app.js. The server still sends the Finance
// and Refunds counts apart; the sidebar has one Money item (decision 026), so they are added here.
import type { NavCounts } from '@/app/layout/useNavCounts';
import { canUseView, viewSpec, type MoneyViewId } from '@/features/money';
import type { DashboardNavCounts } from '../types';

/**
 * Maps the payload's counts to the sidebar's: the number chip, plus the red dot where some of the items are late. A
 * count of zero is left out, so the sidebar shows nothing for an empty queue (the demo's `b && b[0]`). Money counts the deposits waiting
 * for review and the open refunds together, and its red dot counts the card disputes whose evidence is due within 3 days. Each part of
 * the Money count is added only when the staff member may use the view it leads to (deposits, refunds, disputes), so a role that
 * cannot open a view never sees its number; a dot with no number is not shown, as before.
 */
export function toNavCounts(counts: DashboardNavCounts, permissions: readonly string[]): NavCounts {
  const out: NavCounts = {};
  const put = (page: string, count: number, late = 0, lateLabel?: string) => {
    if (count > 0) out[page] = { count, ...(late > 0 ? { late } : {}), ...(lateLabel ? { lateLabel } : {}) };
  };
  put('orders', counts.orders.open, counts.orders.pastSla);
  put('support', counts.support.open, counts.support.late, 'past the reply target');
  const mayUse = (view: MoneyViewId) => canUseView(viewSpec(view), permissions);
  put(
    'money',
    (mayUse('deposits') ? counts.finance.pendingDeposits : 0) + (mayUse('refunds') ? counts.refunds.open : 0),
    mayUse('disputes') ? counts.refunds.disputesDueSoon : 0,
    'dispute deadlines within 3 days',
  );
  put('risk', counts.risk.held);
  return out;
}
