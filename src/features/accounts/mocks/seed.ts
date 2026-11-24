// Builds the accounts mock data from the demo seed: the demo's merchants (`S.merchants`, wallets, holds, client and group prices,
// services) and customers (`S.customers`, `S.dsr`, risk, legal documents) as one list of accounts. A merchant keeps its number, customer
// `cN` is account `100 + N` (`src/mocks/seed/accountIds.ts`). Extra API keys are made up, since the demo has none. Dev and tests only.
import { Collection } from '@/mocks/db';
import { demoNumericId, demoRows, loadDemoState, toIso, toMoney, type DemoState } from '@/mocks/seed';
import { accountIdOfDemo, customerAccountId, merchantAccountId } from '@/mocks/seed/accountIds';
import type { ApiKey, DataRequestKind, Rank } from '../types';
import type { AccountState, MockAccount, MockPrice, MockRequest, MockService, OrderRisk } from './types';

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

/** A merchant of the demo seed, as the demo stores it (the fields the mock uses). */
type DemoMerchant = {
  id: string;
  name: string;
  cc: string;
  group: 'std' | 'whl' | 'vip';
  status: 'active' | 'pending' | 'suspended';
  credit: number;
  joined: number;
  email: string;
  key: string;
  ips: string[];
  lastSeen: number;
};

/** A customer of the demo seed, as the demo stores it (the fields the mock uses). */
type DemoCustomer = {
  id: string;
  name: string;
  email: string;
  country: string;
  cur: string;
  hasAccount: boolean;
  optIn: boolean;
  status: 'active' | 'suspended' | 'blocked' | 'anonymized';
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

type DemoService = {
  id: string;
  code: string;
  name: string;
  type: string;
  cost: number;
  price: number;
  minProfit: number;
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
type DemoLegal = { type: string; version: string; current: boolean };

/** The ids of the demo's three merchant ranks keep their order; the shop's retail rank is the map's fourth (`kind: b2c_retail`). */
export const RANK_IDS = { std: 1, whl: 2, vip: 3, retail: 4 } as const;

const rank = (
  id: number,
  name: string,
  discount: number,
  deposit: number,
  extra: Partial<Rank> = {},
): Rank => ({
  id,
  name,
  kind: 'b2b',
  rankKind: 'merchant',
  discountPercent: toMoney(discount),
  isDefault: false,
  depositLimit: toMoney(deposit),
  overdraftAllowed: true,
  sort: id,
  createdAt: toIso(Date.now() - 400 * DAY_MS),
  ...extra,
});

const RANKS: Rank[] = [
  rank(1, 'Standard', 0, 5000, { isDefault: true, overdraftAllowed: false }),
  rank(2, 'Wholesale', 4, 20000),
  rank(3, 'VIP', 8, 100000),
  rank(4, 'Storefront retail', 0, 1000, { kind: 'b2c_retail', rankKind: 'retail', overdraftAllowed: false }),
];

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const iso = (ms: number | null): string | null => (ms ? toIso(ms) : null);

/** The merchant of the seed that staff invited and who has not chosen a password yet: active, with "Invitation pending" in the list. */
const INVITED_ID = 18;
/** The one legacy merchant that was still `pending`: the merge turned it into a suspended account with a fixed reason. */
const FORMER_PENDING_ID = 20;
/** The reason the migration gave a former pending merchant. */
export const FORMER_PENDING_REASON = 'Waiting for approval before the accounts were merged';

/** The id and email of the extra customer the demo lacks: a guest with an empty name, as a checkout without a name makes one. */
export const NAMELESS_ACCOUNT = { id: customerAccountId(31), email: 'no.name@mail.example' } as const;

// The business details the demo has no field for, by merchant id: the first merchants carry some, the rest are empty.
const BUSINESS: Record<number, { address: string; taxId: string; internalNotes: string }> = {
  1: {
    address: 'Abdali Boulevard, Amman',
    taxId: 'JO-1234567',
    internalNotes: 'Pays by bank transfer on Sundays.',
  },
  2: { address: 'Olaya Street, Riyadh', taxId: 'SA-300112233400003', internalNotes: '' },
};

const STAFF = { id: 1, name: 'Rami K.' };

/** The ids the mock gives the shop currencies, and the currency each country pays in (retail accounts have one). */
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

function fromDemoMerchant(m: DemoMerchant): MockAccount {
  const id = merchantAccountId(demoNumericId(m.id));
  const created = Date.now() - m.joined * DAY_MS;
  const pending = m.status === 'pending';
  const invited = id === INVITED_ID;
  const status = m.status === 'pending' ? 'suspended' : m.status;
  return {
    id,
    email: m.email,
    emailVerifiedAt: pending || invited ? null : toIso(created + HOUR_MS),
    name: m.name,
    phone: '',
    country: m.cc,
    company: m.name,
    address: BUSINESS[id]?.address ?? '',
    taxId: BUSINESS[id]?.taxId ?? '',
    internalNotes: BUSINESS[id]?.internalNotes ?? '',
    username: slug(m.name),
    status,
    rankId: RANK_IDS[m.group],
    hasAccount: true,
    createdAt: toIso(created),
    createdBy: invited ? STAFF : null,
    currencyCode: 'USD',
    marketingOptIn: false,
    suspension:
      status === 'suspended'
        ? pending
          ? { at: toIso(created), reason: FORMER_PENDING_REASON, by: null }
          : { at: toIso(Date.now() - 6 * DAY_MS), reason: 'Chargeback dispute', by: STAFF }
        : null,
    anonymizedAt: null,
    lastLoginAt: iso(m.lastSeen),
    // How the merchant signs in, made up from the demo's status, last sign-in and allowed addresses.
    security: {
      hasPassword: !invited,
      mustChangePassword: false,
      passwordChangedAt: pending || invited ? null : toIso(created + HOUR_MS),
      twofaEnabled: !pending && !invited && id % 2 === 1,
      lastLoginAt: iso(m.lastSeen),
      lastLoginIp: m.lastSeen ? (m.ips?.[0] ?? '203.0.113.201') : null,
      activeSessions: 0,
      linkSentAt: invited ? toIso(Date.now() - 20 * 60_000) : null,
      verificationSentAt: id === FORMER_PENDING_ID ? toIso(Date.now() - 2 * HOUR_MS) : null,
    },
    legacy: { type: 'merchant', id },
    checkoutIp: m.ips?.[0] ?? '203.0.113.201',
  };
}

function fromDemoCustomer(c: DemoCustomer): MockAccount {
  const id = accountIdOfDemo(c.id);
  return {
    id,
    email: c.email,
    emailVerifiedAt: c.emailVerified ? toIso(c.created) : null,
    name: c.name,
    phone: c.phone,
    country: c.country,
    company: '',
    address: '',
    taxId: '',
    internalNotes: c.notes,
    username: null,
    status: c.status,
    rankId: RANK_IDS.retail,
    hasAccount: c.hasAccount,
    createdAt: toIso(c.created),
    // A customer the team added carries a staff creator; the seed has none, and the others came on their own.
    createdBy: c.createdBy === 'admin' ? STAFF : null,
    currencyCode: c.cur,
    marketingOptIn: c.optIn,
    suspension: c.suspendedAt
      ? { at: toIso(c.suspendedAt), reason: c.suspendedReason || null, by: null }
      : null,
    anonymizedAt: null,
    lastLoginAt: iso(c.lastLogin),
    security: {
      hasPassword: c.pwChangedAt !== null,
      mustChangePassword: c.mustChangePw,
      passwordChangedAt: iso(c.pwChangedAt),
      twofaEnabled: false,
      lastLoginAt: iso(c.lastLogin),
      lastLoginIp: c.lastIp,
      activeSessions: c.sessions,
      linkSentAt: iso(c.resetSentAt),
      verificationSentAt: null,
    },
    legacy: { type: 'customer', id: demoNumericId(c.id) },
    checkoutIp: c.lastIp ?? '203.0.113.24',
  };
}

/**
 * An active guest with an EMPTY name, as the backend creates one for an emailed sign-in link or a checkout that gave no name. The demo
 * has no such customer, so the mock adds one: the console must still list it and let staff open it.
 */
function nameless(): MockAccount {
  const created = toIso(Date.now() - 5 * DAY_MS);
  return {
    id: NAMELESS_ACCOUNT.id,
    email: NAMELESS_ACCOUNT.email,
    emailVerifiedAt: created,
    name: '',
    phone: '',
    country: 'GB',
    company: '',
    address: '',
    taxId: '',
    internalNotes: '',
    username: null,
    status: 'active',
    rankId: RANK_IDS.retail,
    hasAccount: false,
    createdAt: created,
    createdBy: null,
    currencyCode: 'GBP',
    marketingOptIn: false,
    suspension: null,
    anonymizedAt: null,
    lastLoginAt: null,
    security: {
      hasPassword: false,
      mustChangePassword: false,
      passwordChangedAt: null,
      twofaEnabled: false,
      lastLoginAt: null,
      lastLoginIp: null,
      activeSessions: 0,
      linkSentAt: null,
      verificationSentAt: null,
    },
    legacy: { type: 'customer', id: 31 },
    checkoutIp: '203.0.113.31',
  };
}

function fromDemoRequest(d: DemoRequest): MockRequest {
  return {
    id: demoNumericId(d.id),
    accountId: accountIdOfDemo(d.cid),
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

// One key per merchant that has a password and is not suspended; the first merchant also has an unused staging key and a revoked old one.
function keysOf(merchants: DemoMerchant[]): ApiKey[] {
  const keys: Omit<ApiKey, 'id'>[] = [];
  const base = (m: DemoMerchant, name: string, extra: Partial<ApiKey> = {}): Omit<ApiKey, 'id'> => ({
    clientId: merchantAccountId(demoNumericId(m.id)),
    name,
    prefix: m.key.slice(0, 13),
    allowedIps: m.ips,
    rateLimitPerMin: 120,
    lastUsedAt: m.lastSeen ? toIso(m.lastSeen) : null,
    lastUsedIp: m.ips[0] ?? '',
    expiresAt: null,
    revokedAt: null,
    createdAt: toIso(Date.now() - Math.max(1, m.joined - 1) * DAY_MS),
    createdByStaff: false,
    ...extra,
  });
  for (const m of merchants.filter(
    (merchant) => merchant.status !== 'pending' && demoNumericId(merchant.id) !== INVITED_ID,
  )) {
    keys.push(base(m, 'Production'));
  }
  const first = merchants[0];
  keys.push(
    base(first, 'Staging', { prefix: 'gsm_test_08xx', lastUsedAt: null, lastUsedIp: '', allowedIps: [] }),
    base(first, 'Legacy integration', {
      prefix: 'gsm_live_01xx',
      revokedAt: toIso(Date.now() - 30 * DAY_MS),
      lastUsedAt: toIso(Date.now() - 45 * DAY_MS),
    }),
  );
  return keys.map((key, index) => ({ ...key, id: index + 1 }));
}

// The risk of each account's shop orders, newest first, from the demo's scored orders.
function riskOf(demo: DemoState): Map<number, OrderRisk[]> {
  const risk = new Map<number, OrderRisk[]>();
  const orders = demoRows<DemoOrder>(demo, 'orders')
    .filter((order) => order.cid && order.risk)
    .sort((a, b) => b.created - a.created);
  for (const order of orders) {
    const id = accountIdOfDemo(order.cid as string);
    const entry = {
      orderId: demoNumericId(order.id),
      score: order.risk?.score ?? 0,
      signals: order.risk?.signals ?? [],
    };
    risk.set(id, [...(risk.get(id) ?? []), entry]);
  }
  return risk;
}

/** Reads the demo state and maps it to the accounts mock stores. */
export async function buildAccountState(): Promise<AccountState> {
  const demo = await loadDemoState();
  const merchants = demoRows<DemoMerchant>(demo, 'merchants');
  const customers = demoRows<DemoCustomer>(demo, 'customers');

  const services = new Map<number, MockService>();
  const byCode = new Map<string, MockService>();
  for (const s of demoRows<DemoService>(demo, 'services')) {
    const service: MockService = {
      id: demoNumericId(s.id),
      name: s.name,
      type: s.type.toLowerCase(),
      basePrice: s.price,
      cost: s.cost,
      minProfit: s.minProfit,
    };
    services.set(service.id, service);
    byCode.set(s.code, service);
  }

  // `m1|IMEI-ICL-CHK` is a merchant's fixed price for a service; `vip|IMEI-ATT-USA` a rank's.
  const prices = Object.entries((demo.clientPrices ?? {}) as Record<string, number>).flatMap(
    ([key, value], index): MockPrice[] => {
      const [merchant, code] = key.split('|');
      const service = byCode.get(code);
      return service
        ? [
            {
              id: index + 1,
              serviceId: service.id,
              clientId: accountIdOfDemo(merchant),
              price: toMoney(value),
              note: '',
              createdAt: toIso(Date.now() - 20 * DAY_MS),
            },
          ]
        : [];
    },
  );
  const rankPrices = new Map<string, number>();
  for (const [key, value] of Object.entries((demo.groupPrices ?? {}) as Record<string, number>)) {
    const [code, serviceCode] = key.split('|');
    const service = byCode.get(serviceCode);
    if (service) rankPrices.set(`${RANK_IDS[code as keyof typeof RANK_IDS]}|${service.id}`, value);
  }

  const legal = new Map<string, string>();
  for (const doc of demoRows<DemoLegal>(demo, 'legal')) {
    if (doc.current) legal.set(doc.type, `${doc.type} v${doc.version}`);
  }

  // The demo keeps each merchant's balance and held amount by demo id (`wallet`, `hold`) and the credit limit on the merchant itself.
  const wallet = (demo.wallet ?? {}) as Record<string, number>;
  const hold = (demo.hold ?? {}) as Record<string, number>;
  const openingWallets = new Map(
    merchants.map((m) => [
      merchantAccountId(demoNumericId(m.id)),
      { balance: wallet[m.id] ?? 0, reserved: hold[m.id] ?? 0, creditLimit: m.credit },
    ]),
  );

  return {
    accounts: new Collection([
      ...merchants.map(fromDemoMerchant),
      ...customers.map(fromDemoCustomer),
      nameless(),
    ]),
    openingWallets,
    ranks: new Collection(RANKS.map((r) => ({ ...r }))),
    prices: new Collection(prices),
    keys: new Collection(keysOf(merchants)),
    requests: new Collection(demoRows<DemoRequest>(demo, 'dsr').map(fromDemoRequest)),
    services,
    rankPrices,
    risk: riskOf(demo),
    legal,
    rankChanges: new Map(),
  };
}
