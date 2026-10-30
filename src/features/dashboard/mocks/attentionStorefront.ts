// The storefront's "Needs attention" facts for the dev mock: held orders, card disputes, late tickets, refund requests and
// failures, and stale exchange rates. Ports attentionB2C() of 12-state-b2c.js (the real server decides these).
import { demoNumericId, toIso, toMoney } from '@/mocks/seed';
import type { AttentionItem } from '../types';
import { createdAt, isHeld } from './orderRules';
import { isLate, lastPublic } from './support';
import { DAY, HOUR, sumBy } from './util';
import type { World } from './world';

/** The storefront's attention items, in the order the demo builds them (the caller ranks them by severity). */
export function storefrontItems(world: World): AttentionItem[] {
  const items: AttentionItem[] = [];

  const held = world.orders.filter(isHeld);
  if (held.length) {
    items.push({
      id: 'risk',
      severity: 'high',
      kind: 'orders_held',
      count: held.length,
      // What the customer paid, VAT included.
      captured: toMoney(sumBy(held, (order) => Number(order.totalPrice) + Number(order.taxAmount))),
      oldestAt: toIso(Math.min(...held.map(createdAt))),
    });
  }

  const disputes = world.disputes
    .filter((dispute) => dispute.status === 'needs_response')
    .sort((a, b) => a.due - b.due);
  if (disputes.length) {
    const first = disputes[0];
    items.push({
      id: 'disp',
      severity: first.due - world.now < 3 * DAY ? 'critical' : 'high',
      kind: 'disputes_due',
      count: disputes.length,
      firstDisputeId: demoNumericId(first.id),
      dueAt: toIso(first.due),
      amount: toMoney(first.amount),
      fee: toMoney(first.fee),
    });
  }

  const late = world.tickets
    .filter((ticket) => isLate(ticket, world.now))
    .sort((a, b) => (lastPublic(a)?.ts ?? 0) - (lastPublic(b)?.ts ?? 0));
  if (late.length) {
    const oldest = late[0];
    items.push({
      id: 'tk',
      severity: 'medium',
      kind: 'tickets_late',
      count: late.length,
      oldestTicketId: demoNumericId(oldest.id),
      waitingSince: toIso(lastPublic(oldest)?.ts ?? oldest.created),
      subject: oldest.subject,
    });
  }

  const requested = world.refunds.filter((refund) => refund.status === 'requested');
  if (requested.length) {
    items.push({
      id: 'rfq',
      severity: 'medium',
      kind: 'refunds_requested',
      count: requested.length,
      total: toMoney(sumBy(requested, (refund) => refund.amount)),
    });
  }

  const failed = world.refunds.filter((refund) => refund.status === 'failed');
  if (failed.length) {
    items.push({
      id: 'rff',
      severity: 'high',
      kind: 'refunds_failed',
      count: failed.length,
      firstRefundId: demoNumericId(failed[0].id),
      reason: failed[0].note,
    });
  }

  const stale = world.currencies.filter(
    (currency) => currency.code !== 'USD' && world.now - currency.updated > 24 * HOUR,
  );
  if (stale.length) {
    items.push({
      id: 'fx',
      severity: 'medium',
      kind: 'fx_stale',
      currencies: stale.map((currency) => currency.code),
      oldestUpdatedAt: toIso(Math.min(...stale.map((currency) => currency.updated))),
    });
  }

  return items;
}
