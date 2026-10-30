// The words and the button of each "Needs attention" row. The server sends facts (a kind and its numbers) and decides which
// rows exist, how severe they are and their order; this file writes the demo's sentence for each kind and picks where its
// button goes. Ports the `title`, `meta`, `cta` and `go` of attention() and attentionB2C() in 11-state.js and 12-state-b2c.js.
import { ordersListPath } from '@/features/orders';
import { ageText, ago, money, money0, pct } from '@/lib/format';
import type { AttentionItem, DashboardScope } from '../types';
import { channelOf, merchantTarget, supplierTarget, type PageTarget } from './links';

/** The row's button: its words and the page it opens. */
export type AttentionAction = PageTarget & { label: string };

export type AttentionView = {
  title: string;
  /** The detail line under the title; empty when the facts give nothing more to say. */
  meta: string;
  /** `null` for a kind this console does not know: the row stays, without a button. */
  action: AttentionAction | null;
};

export type AttentionContext = {
  /** The moment relative times are measured from (`useNow`). */
  now: number;
  scope: DashboardScope;
};

/** What a row shows for a kind from a newer server: its severity badge stays, the title is neutral, no button. */
export const UNKNOWN_ATTENTION: AttentionView = { title: 'Needs attention', meta: '', action: null };

// "1 order is", "3 orders are": the demo agrees the verb with the count.
const some = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

const go = (label: string, page: string, to: string): AttentionAction => ({ label, page, to });
const goTo = (label: string, target: PageTarget): AttentionAction => ({ label, ...target });

// "Supplier returned X" reads better mid-sentence as "supplier returned X".
const reasonText = (reason: string): string =>
  reason.replace(/^Supplier returned /, 'supplier returned ').replace(/^Supplier /, 'supplier ');

// A dispute due date in the future is "is due in 2d 3h"; one already past is "was due 4h ago".
function dueText(dueAt: string, now: number): string {
  const left = Date.parse(dueAt) - now;
  return left > 0 ? `is due in ${ageText(left)}` : `was due ${ageText(-left)} ago`;
}

/** The sentence and button for one attention item. An unknown kind gets `UNKNOWN_ATTENTION`. */
export function describeAttention(item: AttentionItem, { now, scope }: AttentionContext): AttentionView {
  switch (item.kind) {
    case 'orders_past_sla':
      return {
        title: `${some(item.count, 'order is', 'orders are')} past SLA`,
        // The item carries no channel, so the order shows as "#id": the ORD-/SF- prefix would be a guess (HANDOFF.md).
        meta: `Oldest #${item.oldestOrderId}, ${ageText(item.overdueSeconds * 1000)} over its ${ageText(item.targetSeconds * 1000)} target`,
        action: go('Open orders', 'orders', ordersListPath({ pastSla: true, channel: channelOf(scope) })),
      };
    case 'orders_review':
      return {
        title: `${some(item.count, 'order needs', 'orders need')} manual review`,
        meta: item.topReason ? `Most common: ${reasonText(item.topReason)} (${item.topReasonCount})` : '',
        action: go('Review queue', 'orders', ordersListPath({ tab: 'review' })),
      };
    case 'supplier_down':
    case 'supplier_degraded':
      return {
        title: `${item.supplierName} is ${item.kind === 'supplier_down' ? 'down' : 'degraded'}`,
        meta: `${item.successRate === null ? '' : `${pct(item.successRate, 0)} success in the last hour, `}${some(item.openOrders, 'open order depends', 'open orders depend')} on it`,
        action: goTo('Open supplier', supplierTarget(item.supplierId)),
      };
    case 'supplier_balance_low':
      return {
        title: `${item.supplierName} prepaid balance is ${money(item.balance)}`,
        meta:
          item.runwayDays === null
            ? `Below the ${money0(item.minimum)} minimum`
            : `About ${item.runwayDays < 1 ? 'less than a day' : `${item.runwayDays.toFixed(1)} days`} of volume left at the 7-day rate`,
        // The demo's "Record top-up" has no route in the map: balances come from the supplier sync (HANDOFF.md).
        action: goTo('Open supplier', supplierTarget(item.supplierId)),
      };
    case 'services_below_floor': {
      const names = item.serviceNames.slice(0, 2).join(', ');
      return {
        title: `${some(item.count, 'service is', 'services are')} priced below cost plus minimum profit`,
        meta: `${names ? `${names} (supplier cost changed). ` : ''}Orders are charged the floor price until you update it`,
        action: go('Fix pricing', 'services', '/services?belowFloor=true'),
      };
    }
    case 'deposits_pending':
      return {
        title: `${some(item.count, 'deposit is', 'deposits are')} waiting for review`,
        meta: `${money0(item.total)} total, oldest ${ago(item.oldestAt, now)}`,
        action: go('Review deposits', 'finance', '/finance?tab=payments'),
      };
    case 'wallets_negative': {
      const first = item.clients[0];
      return {
        title: `${some(item.count, 'merchant has', 'merchants have')} a negative wallet`,
        meta: item.clients.map((client) => `${client.name} ${money(client.balance)}`).join(', '),
        action: first
          ? goTo('Open merchant', merchantTarget(first.id))
          : go('Open merchant', 'merchants', '/merchants'),
      };
    }
    case 'merchants_pending':
      return {
        title: `${some(item.count, 'merchant account', 'merchant accounts')} waiting for approval`,
        meta: item.names.join(', '),
        action: go('Review', 'merchants', '/merchants?tab=pending'),
      };
    case 'commissions_accrued':
      return {
        title: `${some(item.count, 'commission accrual', 'commission accruals')} ready to approve`,
        meta: `${money(item.total)} across ${some(item.agents, 'agent', 'agents')}`,
        action: go('Review', 'commissions', '/commissions'),
      };
    case 'orders_held':
      return {
        title: `${some(item.count, 'paid order is', 'paid orders are')} held by the risk engine`,
        meta: `${money0(item.captured)} captured. Nothing goes to a supplier until a person decides. Oldest ${ago(item.oldestAt, now)}`,
        action: go('Review queue', 'risk', '/risk'),
      };
    case 'disputes_due':
      return {
        title: `${some(item.count, 'card dispute needs', 'card disputes need')} evidence`,
        meta: `DP-${item.firstDisputeId} ${dueText(item.dueAt, now)}. Missing the date loses the dispute and ${money(item.amount)} plus a ${money0(item.fee)} fee`,
        action: go('Open disputes', 'refunds', '/refunds?tab=disputes'),
      };
    case 'tickets_late':
      return {
        title: `${some(item.count, 'ticket is', 'tickets are')} waiting past the reply target`,
        meta: `Oldest T-${item.oldestTicketId}, ${ageText(now - Date.parse(item.waitingSince))} without a reply. ${item.subject}`,
        action: go('Open inbox', 'support', '/support?filter=late'),
      };
    case 'refunds_requested':
      return {
        title: `${some(item.count, 'refund request needs', 'refund requests need')} a decision`,
        meta: `${money(item.total)} if all are approved`,
        action: go('Review', 'refunds', '/refunds?tab=refunds&status=requested'),
      };
    case 'refunds_failed':
      return {
        title: `${some(item.count, 'refund failed', 'refunds failed')} at the gateway`,
        meta: `RF-${item.firstRefundId}: ${item.reason}`,
        action: go('Retry', 'refunds', '/refunds?tab=refunds&status=failed'),
      };
    case 'fx_stale':
      return {
        title: `Exchange rate for ${item.currencies.join(', ')} is out of date`,
        meta: `Last updated ${ago(item.oldestUpdatedAt, now)}. Customers are being quoted a stale price in that currency`,
        action: go('Refresh rates', 'settings', '/settings?tab=tax'),
      };
    default:
      return UNKNOWN_ATTENTION;
  }
}
