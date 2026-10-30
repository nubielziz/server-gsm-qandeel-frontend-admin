// The dev mock store of the customers feature, seeded from the demo (`S.customers`, `S.dsr`) and mapped to API-style records (decision 014).
// It also keeps what the detail needs from other demo tables: refund, ticket and dispute counts, the risk of each order, the legal documents.
// Order figures come from the orders mock store when asked (see dto.ts). Dev and tests only.
import { Collection } from '@/mocks/db';
import { demoNumericId, demoRows, loadDemoState, toIso, type DemoState } from '@/mocks/seed';
import type { CustomerStatus, DataRequestKind, RiskLevel } from '../types';
import type { CustomerState, MockCustomer, MockRequest, OrderRisk } from './types';

/** A customer of the demo seed, as the demo stores it (the fields the mock uses). */
type DemoCustomer = {
  id: string;
  name: string;
  email: string;
  country: string;
  cur: string;
  locale: string;
  hasAccount: boolean;
  optIn: boolean;
  risk: 'low' | 'med' | 'high';
  status: CustomerStatus;
  created: number;
  notes: string;
  phone: string;
  emailVerified: boolean;
  createdBy: 'self' | 'checkout' | 'admin';
  lastLogin: number | null;
  sessions: number;
  pwChangedAt: number | null;
  mustChangePw: boolean;
  resetSentAt: number | null;
  suspendedAt: number | null;
  suspendedReason: string;
  lastIp: string | null;
};

/** A data request of the demo seed (`S.dsr`). */
type DemoRequest = {
  id: string;
  cid: string;
  kind: DataRequestKind;
  status: 'open' | 'done';
  requested: number;
  due: number;
  done: number | null;
};

type DemoOrder = { id: string; cid?: string; created: number; risk?: { score: number; signals: string[] } };
type DemoLegal = { type: string; version: string; lang: string; current: boolean };
type DemoRow = { cid?: string; who?: { type: string; id: string } };

/** The ids the mock gives the storefront currencies, and the currency each country pays in. */
const CURRENCY_IDS: Record<string, number> = { USD: 1, GBP: 2, EUR: 3, SEK: 4, CAD: 5, AED: 6, SAR: 7 };
export const COUNTRY_CURRENCY: Record<string, string> = {
  GB: 'GBP',
  DE: 'EUR',
  FR: 'EUR',
  NL: 'EUR',
  IE: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  SE: 'SEK',
  US: 'USD',
  CA: 'CAD',
  AE: 'AED',
  SA: 'SAR',
};
export const currencyId = (code: string): number => CURRENCY_IDS[code] ?? 1;

const RISK: Record<DemoCustomer['risk'], RiskLevel> = { low: 'low', med: 'medium', high: 'high' };
const iso = (ms: number | null): string | null => (ms ? toIso(ms) : null);

function fromDemoCustomer(c: DemoCustomer): MockCustomer {
  return {
    id: demoNumericId(c.id),
    email: c.email,
    emailVerifiedAt: c.emailVerified ? toIso(c.created) : null,
    name: c.name,
    phone: c.phone,
    country: c.country,
    locale: c.locale,
    currency: currencyId(c.cur),
    currencyCode: c.cur,
    hasAccount: c.hasAccount,
    // A customer the team added would carry a staff id; the seed has none, and the others came on their own.
    createdBy: c.createdBy === 'admin' ? 1 : null,
    marketingOptIn: c.optIn,
    riskLevel: RISK[c.risk],
    status: c.status,
    suspendedAt: iso(c.suspendedAt),
    suspendedReason: c.suspendedReason || null,
    suspendedBy: null,
    internalNotes: c.notes,
    lastLoginAt: iso(c.lastLogin),
    anonymizedAt: null,
    createdAt: toIso(c.created),
    mustChangePassword: c.mustChangePw,
    passwordChangedAt: iso(c.pwChangedAt),
    resetSentAt: iso(c.resetSentAt),
    activeSessions: c.sessions,
    lastIp: c.lastIp,
    checkoutIp: c.lastIp ?? '203.0.113.24',
  };
}

function fromDemoRequest(d: DemoRequest): MockRequest {
  return {
    id: demoNumericId(d.id),
    customerId: demoNumericId(d.cid),
    kind: d.kind,
    status: d.status === 'done' ? 'completed' : 'open',
    requestedAt: toIso(d.requested),
    dueAt: toIso(d.due),
    completedAt: iso(d.done),
    handledBy: d.done ? 1 : null,
    fileId: null,
    createdAt: toIso(d.requested),
  };
}

// How many rows of a demo table belong to each customer.
function countBy(rows: DemoRow[], pick: (row: DemoRow) => string | undefined): Map<number, number> {
  const counts = new Map<number, number>();
  for (const row of rows) {
    const cid = pick(row);
    if (cid) counts.set(demoNumericId(cid), (counts.get(demoNumericId(cid)) ?? 0) + 1);
  }
  return counts;
}

function build(demo: DemoState): CustomerState {
  const refunds = countBy(demoRows<DemoRow>(demo, 'refunds'), (row) => row.cid);
  const disputes = countBy(demoRows<DemoRow>(demo, 'disputes'), (row) => row.cid);
  const tickets = countBy(demoRows<DemoRow>(demo, 'tickets'), (row) =>
    row.who?.type === 'customer' ? row.who.id : undefined,
  );

  const risk = new Map<number, OrderRisk[]>();
  const orders = demoRows<DemoOrder>(demo, 'orders')
    .filter((order) => order.cid && order.risk)
    .sort((a, b) => b.created - a.created);
  for (const order of orders) {
    const id = demoNumericId(order.cid as string);
    const entry = {
      orderId: demoNumericId(order.id),
      score: order.risk?.score ?? 0,
      signals: order.risk?.signals ?? [],
    };
    risk.set(id, [...(risk.get(id) ?? []), entry]);
  }

  const legal = new Map<string, string>();
  for (const doc of demoRows<DemoLegal>(demo, 'legal')) {
    if (doc.current && doc.lang === 'EN') legal.set(doc.type, `${doc.type} v${doc.version}`);
  }

  const customers = demoRows<DemoCustomer>(demo, 'customers').map(fromDemoCustomer);
  return {
    customers: new Collection(customers),
    requests: new Collection(demoRows<DemoRequest>(demo, 'dsr').map(fromDemoRequest)),
    counts: new Map(
      customers.map((c) => [
        c.id,
        {
          refunds: refunds.get(c.id) ?? 0,
          tickets: tickets.get(c.id) ?? 0,
          disputes: disputes.get(c.id) ?? 0,
        },
      ]),
    ),
    risk,
    legal,
  };
}

let state: Promise<CustomerState> | undefined;

/** The customers feature's mock data, seeded from the demo on first use. Handlers change it in place. */
export function customerState(): Promise<CustomerState> {
  state ??= loadDemoState().then(build);
  return state;
}

/** Drops the data so the next use re-seeds it (tests). */
export function resetCustomerStore(): void {
  state = undefined;
}
