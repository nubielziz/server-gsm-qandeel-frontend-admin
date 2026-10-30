// Maps the demo's refunds, disputes and storefront orders (`S.refunds`, `S.disputes`, `S.orders`) to the DTOs of the refunds
// feature, for the dev mock layer (decision 014). Ids lose their prefix (`RF-1007` is 1007); a payment takes the id of its
// order, because the demo has no payment records of its own.
import type { NamedRef } from '@/features/orders';
import { Collection } from '@/mocks/db';
import { demoNumericId, demoRows, loadDemoState, toIso, toMoney } from '@/mocks/seed';
import { demoStaffIds } from '@/mocks/staff';
import type { Dispute, PaymentLine, Refund } from '../types';
import type { DemoCustomer, DemoDispute, DemoLegal, DemoOrder, DemoRefund, DemoTicket } from './demoTypes';
import { buildEvidence, type EvidenceContext } from './evidence';
import { splitRefund } from './split';

const DAY = 86_400_000;

/** Everything the mock routes read and change. */
export type RefundsMockState = {
  refunds: Collection<Refund>;
  /** Disputes always carry their evidence pack here; the list route leaves it out. */
  disputes: Collection<Dispute>;
  payments: Collection<PaymentLine>;
  /** All-time chargeback losses, dispute fees included (USD). Accepting a loss adds to it. */
  chargebackLoss: number;
  /** Storefront sales of the last 30 days (USD): what the refunded percentage is taken of. */
  sales30d: number;
};

const grossOf = (order: DemoOrder): number => order.gross ?? order.price;

function toRefund(
  r: DemoRefund,
  order: DemoOrder,
  customer: NamedRef | null,
  staffIds: ReadonlyMap<string, number>,
): Refund {
  const done = r.status === 'completed';
  const split = splitRefund(grossOf(order), order.tax ?? 0, r.amount);
  // After a decision `by` is the staff member who made it; "System" refunds open themselves.
  const decidedBy = !r.auto && r.status !== 'requested' ? r.by : null;
  return {
    id: demoNumericId(r.id),
    orderId: demoNumericId(r.oid),
    status: r.status,
    method: r.method,
    amount: toMoney(r.amount),
    reason: r.reason,
    currency: r.cur,
    fx: String(order.fx ?? 1),
    partial: r.partial,
    gatewayRefundId: r.gw,
    note: r.note || null,
    requestedBy: r.auto ? { type: 'system', name: 'System' } : { type: 'customer', name: null },
    approvedBy: decidedBy ? { id: staffIds.get(decidedBy) ?? 0, name: decidedBy } : null,
    customer,
    order: {
      id: demoNumericId(order.id),
      deliveredAt: order.status === 'completed' && order.doneAt ? toIso(order.doneAt) : null,
      cost: toMoney(order.cost),
    },
    payment: {
      id: demoNumericId(order.id),
      method: order.pay.method,
      brand: order.pay.brand,
      amount: toMoney(grossOf(order)),
      taxAmount: toMoney(order.tax ?? 0),
    },
    netAmount: done ? toMoney(split.net) : null,
    taxAmount: done ? toMoney(split.tax) : null,
    completedAt: done ? toIso(r.created) : null,
    createdAt: toIso(r.created),
  };
}

function toDispute(
  d: DemoDispute,
  order: DemoOrder,
  customer: DemoCustomer,
  context: EvidenceContext,
): Dispute {
  const { items, strength } = buildEvidence(order, customer, context);
  return {
    id: demoNumericId(d.id),
    orderId: demoNumericId(d.oid),
    status: d.status,
    reasonCode: d.code,
    note: d.note,
    amount: toMoney(d.amount),
    fee: toMoney(d.fee),
    currency: d.cur,
    fx: String(order.fx ?? 1),
    evidenceDueAt: toIso(d.due),
    submittedAt: d.submittedAt ? toIso(d.submittedAt) : null,
    resolvedAt: d.resolvedAt ? toIso(d.resolvedAt) : null,
    createdAt: toIso(d.opened),
    customer: { id: demoNumericId(customer.id), name: customer.name },
    evidence: items,
    strength,
  };
}

function toPayment(order: DemoOrder, customer: NamedRef | null): PaymentLine {
  return {
    id: demoNumericId(order.id),
    orderId: demoNumericId(order.id),
    amount: toMoney(grossOf(order)),
    feeAmount: toMoney(order.fee ?? 0),
    createdAt: toIso(order.created),
    method: order.pay.method,
    brand: order.pay.brand,
    status: order.pay.status,
    currency: order.cur ?? 'USD',
    fx: String(order.fx ?? 1),
    customer,
  };
}

/** Builds the stores from the demo seed (timestamps moved to now). */
export async function buildState(): Promise<RefundsMockState> {
  const demo = await loadDemoState();
  const storefront = demoRows<DemoOrder>(demo, 'orders').filter((order) => order.cid);
  const orders = new Map(storefront.map((order) => [order.id, order]));
  const customers = new Map(demoRows<DemoCustomer>(demo, 'customers').map((c) => [c.id, c]));
  const named = (id: string | undefined): NamedRef | null => {
    const customer = id ? customers.get(id) : undefined;
    return customer ? { id: demoNumericId(customer.id), name: customer.name } : null;
  };
  const staffIds = demoStaffIds(demo);
  const context: EvidenceContext = {
    orders: storefront,
    tickets: demoRows<DemoTicket>(demo, 'tickets'),
    legal: demoRows<DemoLegal>(demo, 'legal'),
  };

  const refunds = demoRows<DemoRefund>(demo, 'refunds').flatMap((r) => {
    const order = orders.get(r.oid);
    return order ? [toRefund(r, order, named(r.cid), staffIds)] : [];
  });
  const disputes = demoRows<DemoDispute>(demo, 'disputes').flatMap((d) => {
    const order = orders.get(d.oid);
    const customer = customers.get(d.cid);
    return order && customer ? [toDispute(d, order, customer, context)] : [];
  });
  const since = Date.now() - 30 * DAY;
  const sales30d = storefront
    .filter((order) => order.status !== 'rejected' && order.created >= since)
    .reduce((total, order) => total + grossOf(order), 0);
  const account = demo.acct as { chargeback_loss?: number } | undefined;

  return {
    refunds: new Collection(refunds),
    disputes: new Collection(disputes),
    payments: new Collection(storefront.map((order) => toPayment(order, named(order.cid)))),
    chargebackLoss: account?.chargeback_loss ?? 0,
    sales30d,
  };
}
