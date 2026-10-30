// Builds the merchants mock data from the demo seed (`S.merchants`, wallets, holds, client and group prices, services), the
// order mock (30-day figures) and the ledger mock (statements). Verification requests and extra API keys are made up, since
// the demo has none; ids lose their prefix (`m3` is 3).
import { Collection } from '@/mocks/db';
import { ledgerStore } from '@/mocks/ledger';
import { orderStore } from '@/mocks/orders';
import { demoNumericId, demoRows, loadDemoState, toIso, toMoney } from '@/mocks/seed';
import type { ApiKey, ClientGroup, StatementRow } from '../types';
import { statementOf, statsOf } from './figures';
import { kycRows } from './kycSeed';
import type { MerchantStore, MockClient, MockPrice, MockService } from './store';

/** A merchant of the demo seed, as the demo stores it (the fields the mock uses). */
type DemoMerchant = {
  id: string;
  name: string;
  cc: string;
  group: 'std' | 'whl' | 'vip';
  status: 'active' | 'pending' | 'suspended';
  credit: number;
  joined: number;
  referredBy: string | null;
  email: string;
  key: string;
  ips: string[];
  kyc: string;
  lastSeen: number;
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

const DAY_MS = 86_400_000;

/** The demo's three groups keep their order as ids; the storefront's retail group is the map's fourth (`kind: b2c_retail`). */
const GROUP_IDS = { std: 1, whl: 2, vip: 3 } as const;

const group = (
  id: number,
  name: string,
  discount: number,
  threshold: number,
  deposit: number,
  extra: Partial<ClientGroup> = {},
): ClientGroup => ({
  id,
  name,
  kind: 'b2b',
  discountPercent: toMoney(discount),
  isDefault: false,
  earnThreshold: toMoney(threshold),
  depositLimit: toMoney(deposit),
  overdraftAllowed: true,
  sort: id,
  createdAt: toIso(Date.now() - 400 * DAY_MS),
  ...extra,
});

const GROUPS: ClientGroup[] = [
  group(1, 'Standard', 0, 0, 5000, { isDefault: true, overdraftAllowed: false }),
  group(2, 'Wholesale', 4, 5000, 20000),
  group(3, 'VIP', 8, 25000, 100000),
  group(4, 'Storefront retail', 0, 0, 1000, { kind: 'b2c_retail', overdraftAllowed: false }),
];

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// One key per merchant that is not pending; the first merchant also has an unused staging key and a revoked old one.
function keysOf(merchants: DemoMerchant[]): ApiKey[] {
  const keys: Omit<ApiKey, 'id'>[] = [];
  const base = (m: DemoMerchant, name: string, extra: Partial<ApiKey> = {}): Omit<ApiKey, 'id'> => ({
    clientId: demoNumericId(m.id),
    name,
    prefix: m.key.slice(0, 13),
    scopes: ['orders:create', 'orders:read', 'account:read'],
    allowedIps: m.ips,
    rateLimitPerMin: 120,
    lastUsedAt: m.lastSeen ? toIso(m.lastSeen) : null,
    lastUsedIp: m.ips[0] ?? '',
    expiresAt: null,
    revokedAt: null,
    createdAt: toIso(Date.now() - Math.max(1, m.joined - 1) * DAY_MS),
    ...extra,
  });
  for (const m of merchants.filter((merchant) => merchant.status !== 'pending')) {
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

/** Reads the demo state, the order mock and the ledger mock and maps them to the merchants mock stores. */
export async function buildStore(): Promise<MerchantStore> {
  const state = await loadDemoState();
  const orders = (await orderStore()).list();
  const ledger = (await ledgerStore()).list();
  const merchants = demoRows<DemoMerchant>(state, 'merchants');
  const wallet = (state.wallet ?? {}) as Record<string, number>;
  const hold = (state.hold ?? {}) as Record<string, number>;

  const clients = merchants.map((m): MockClient => {
    const id = demoNumericId(m.id);
    const created = Date.now() - m.joined * DAY_MS;
    return {
      id,
      username: slug(m.name),
      email: m.email,
      name: m.name,
      company: m.name,
      phone: '',
      country: m.cc,
      groupId: GROUP_IDS[m.group],
      status: m.status,
      kycStatus: m.kyc === 'Verified' ? 'approved' : 'pending',
      referredById: m.referredBy ? demoNumericId(m.referredBy) : null,
      referralCode: `GSM${String(id).padStart(4, '0')}`,
      emailVerifiedAt: m.status === 'pending' ? null : toIso(created + 3_600_000),
      createdAt: toIso(created),
      balance: wallet[m.id] ?? 0,
      reserved: hold[m.id] ?? 0,
      creditLimit: m.credit,
      stats: statsOf(id, orders, m.lastSeen),
    };
  });

  const services = new Map<number, MockService>();
  const byCode = new Map<string, MockService>();
  for (const s of demoRows<DemoService>(state, 'services')) {
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

  // `m1|IMEI-ICL-CHK` is a merchant's fixed price for a service; `vip|IMEI-ATT-USA` a group's.
  const prices = Object.entries((state.clientPrices ?? {}) as Record<string, number>).flatMap(
    ([key, value], index): MockPrice[] => {
      const [merchant, code] = key.split('|');
      const service = byCode.get(code);
      return service
        ? [
            {
              id: index + 1,
              serviceId: service.id,
              clientId: demoNumericId(merchant),
              price: toMoney(value),
              note: '',
              createdAt: toIso(Date.now() - 20 * DAY_MS),
            },
          ]
        : [];
    },
  );
  const groupPrices = new Map<string, number>();
  for (const [key, value] of Object.entries((state.groupPrices ?? {}) as Record<string, number>)) {
    const [code, serviceCode] = key.split('|');
    const service = byCode.get(serviceCode);
    if (service) groupPrices.set(`${GROUP_IDS[code as keyof typeof GROUP_IDS]}|${service.id}`, value);
  }

  const statements = new Map<number, StatementRow[]>(
    clients.map((client) => [client.id, statementOf(client.id, ledger)]),
  );

  return {
    clients: new Collection(clients),
    groups: new Collection(GROUPS.map((g) => ({ ...g }))),
    prices: new Collection(prices),
    kyc: new Collection(kycRows(clients)),
    keys: new Collection(keysOf(merchants)),
    statements,
    services,
    groupPrices,
  };
}
