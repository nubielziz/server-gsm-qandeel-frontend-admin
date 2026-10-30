// Builds what the customers routes send from the mock store and the orders mock store: the list row with its order figures, the
// detail with the account, the latest consent records and the risk summary, and the data request with the customer's name. The
// figures are worked out when asked, so an order changed in the orders mock moves the customer's spend and counts. Dev and tests only.
import { orderStore, type MockOrder } from '@/mocks/orders';
import { toIso, toMoney } from '@/mocks/seed';
import type { ConsentRecord, Customer, CustomerDetail, DataRequest } from '../types';
import type { CustomerState, MockCustomer, MockRequest } from './types';

/** The orders of every customer, grouped by customer id. */
export async function ordersByCustomer(): Promise<Map<number, MockOrder[]>> {
  const groups = new Map<number, MockOrder[]>();
  for (const order of (await orderStore()).list()) {
    const id = order.customer?.id;
    if (id !== undefined) groups.set(id, [...(groups.get(id) ?? []), order]);
  }
  return groups;
}

// The figures of one customer's orders. Spend is the gross of the orders that were not rejected (the demo's `custStats`).
function factsOf(orders: readonly MockOrder[]) {
  const spent = orders
    .filter((order) => order.status !== 'rejected')
    .reduce((sum, order) => sum + Number(order.totalPrice) + Number(order.taxAmount), 0);
  const byTime = [...orders].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  return {
    count: orders.length,
    spent: toMoney(spent),
    firstOrderAt: byTime[0]?.createdAt ?? null,
    lastOrderAt: byTime.at(-1)?.createdAt ?? null,
    latest: byTime.at(-1) ?? null,
  };
}

/** The list row. */
export function toCustomer(row: MockCustomer, orders: readonly MockOrder[]): Customer {
  const facts = factsOf(orders);
  return {
    id: row.id,
    email: row.email,
    emailVerifiedAt: row.emailVerifiedAt,
    name: row.name,
    phone: row.phone,
    country: row.country,
    locale: row.locale,
    currency: row.currency,
    currencyCode: row.currencyCode,
    hasAccount: row.hasAccount,
    createdBy: row.createdBy,
    marketingOptIn: row.marketingOptIn,
    riskLevel: row.riskLevel,
    status: row.status,
    suspendedAt: row.suspendedAt,
    suspendedReason: row.suspendedReason,
    suspendedBy: row.suspendedBy,
    internalNotes: row.internalNotes,
    lastLoginAt: row.lastLoginAt,
    firstOrderAt: facts.firstOrderAt,
    totalSpent: facts.spent,
    anonymizedAt: row.anonymizedAt,
    createdAt: row.createdAt,
    ordersCount: facts.count,
    lastOrderAt: facts.lastOrderAt,
  };
}

// The consent records of the latest order: terms, privacy, refund policy and the withdrawal waiver a few seconds before the
// order, and the marketing opt-in when the customer has one (the demo's `consentsFor`).
function consentsOf(row: MockCustomer, order: MockOrder, state: CustomerState): ConsentRecord[] {
  const at = Date.parse(order.createdAt);
  const record = (purpose: string, document: string | null, before: number): ConsentRecord => ({
    purpose,
    document,
    at: toIso(at - before),
    ip: row.checkoutIp,
  });
  return [
    record('terms', state.legal.get('Terms of service') ?? null, 41_000),
    record('privacy', state.legal.get('Privacy policy') ?? null, 41_000),
    record('refund_policy', state.legal.get('Refund policy') ?? null, 41_000),
    record('withdrawal_waiver', null, 38_000),
    ...(row.marketingOptIn ? [record('marketing', null, 36_000)] : []),
  ];
}

/** The detail: the list row plus the figures, the account (none for a guest), the consent evidence and the risk summary. */
export function toDetail(
  row: MockCustomer,
  orders: readonly MockOrder[],
  state: CustomerState,
): CustomerDetail {
  const facts = factsOf(orders);
  const counts = state.counts.get(row.id) ?? { refunds: 0, tickets: 0, disputes: 0 };
  const scored = state.risk.get(row.id) ?? [];
  return {
    ...toCustomer(row, orders),
    stats: { orders: facts.count, spent: facts.spent, lastOrderAt: facts.lastOrderAt, ...counts },
    account: row.hasAccount
      ? {
          emailVerified: row.emailVerifiedAt !== null,
          mustChangePassword: row.mustChangePassword,
          passwordChangedAt: row.passwordChangedAt,
          resetSentAt: row.resetSentAt,
          activeSessions: row.activeSessions,
          lastIp: row.lastIp,
        }
      : null,
    latestConsents: facts.latest
      ? { orderId: facts.latest.id, records: consentsOf(row, facts.latest, state) }
      : null,
    risk: {
      highestScore: scored.length > 0 ? Math.max(...scored.map((entry) => entry.score)) : null,
      signals: scored.flatMap((entry) => entry.signals.map((text) => ({ text, orderId: entry.orderId }))),
    },
  };
}

/** A data request with the customer's current name. */
export function toRequest(row: MockRequest, state: CustomerState): DataRequest {
  return { ...row, customerName: state.customers.find(row.customerId)?.name ?? 'Unknown customer' };
}
