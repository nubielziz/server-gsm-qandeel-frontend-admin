// Builds the mock stores from the demo's own seed (`S.services`, `S.suppliers`, `S.merchants`, `GROUPS`, `S.groupPrices`,
// `S.clientPrices`, `S.categoryRules`), mapped to the API's shapes. The demo has no categories, option lists, custom fields or code stock as
// records, so those are made up: categories from the services' category names, a few fields and options, and codes for two
// digital-code services (Z3X credits and the UnlockTool licence).
import { demoNumericId, demoRows, toIso, type DemoState } from '@/mocks/seed';
import { Collection } from '@/mocks/db';
import type { ServiceType } from '../types';
import type { MockCategory, MockCode, MockGroup, MockMerchant, MockRule, MockService } from './types';

/** A service of the demo seed, as the demo stores it (the fields the mock uses). */
export type DemoService = {
  id: string;
  code: string;
  name: string;
  type: 'IMEI' | 'Server' | 'Remote' | 'File';
  category: string;
  cost: number;
  costWas: number | null;
  price: number;
  minProfit: number;
  sla: number;
  sup: string;
  fb: string | null;
  status: 'active' | 'disabled';
  auto: boolean;
};
type DemoNamed = { id: string; name: string };
type DemoMerchant = DemoNamed & { group: string };

/** The demo's three merchant groups (`GROUPS` in 10-data.js) with the ids the mock gives them. */
export const GROUPS: readonly MockGroup[] = [
  { id: 1, name: 'Standard', kind: 'b2b', discountPercent: 0 },
  { id: 2, name: 'Wholesale', kind: 'b2b', discountPercent: 4 },
  { id: 3, name: 'VIP', kind: 'b2b', discountPercent: 8 },
];
const GROUP_IDS: Record<string, number> = { std: 1, whl: 2, vip: 3 };

/** Everything the mock server keeps for this feature. */
export type Stores = {
  services: Collection<MockService>;
  categories: Collection<MockCategory>;
  rules: Collection<MockRule>;
  codes: Collection<MockCode>;
  groups: readonly MockGroup[];
  suppliers: ReadonlyMap<number, string>;
  merchants: ReadonlyMap<number, MockMerchant>;
  /** Merchant overrides by `${merchantId}|${serviceId}`; the merchants feature owns their editing. */
  clientPrices: ReadonlyMap<string, number>;
};

// Codes for a digital-code service: a made-up but stable pattern, the first few sold, one voided.
function codesFor(
  serviceId: number,
  prefix: string,
  count: number,
  firstId: number,
  now: number,
): MockCode[] {
  const tails = ['A1B2', 'C3D4', 'E5F6', 'G7H8'];
  return Array.from({ length: count }, (_, index) => {
    const sold = index < 4;
    const voided = index === count - 1;
    return {
      id: firstId + index,
      serviceId,
      code: `${prefix}-${String(1000 + index)}-${tails[index % tails.length]}`,
      status: voided ? 'void' : sold ? 'sold' : 'available',
      orderId: sold ? 48100 + index : null,
      batchRef: index < 8 ? 'B-0001' : 'B-0002',
      createdAt: toIso(now - (count - index) * 3_600_000),
    };
  });
}

/** The stores for one run of the mock server. */
export function buildStores(state: DemoState): Stores {
  const demoServices = demoRows<DemoService>(state, 'services');
  const suppliers = new Map(
    demoRows<DemoNamed>(state, 'suppliers').map((s) => [demoNumericId(s.id), s.name]),
  );
  const merchants = new Map(
    demoRows<DemoMerchant>(state, 'merchants').map((m) => [
      demoNumericId(m.id),
      { id: demoNumericId(m.id), name: m.name, groupId: GROUP_IDS[m.group] ?? 1 },
    ]),
  );

  // Categories come from the services' category names, in order of first appearance; a category takes the type of its first service.
  const categoryIds = new Map<string, number>();
  const categories: MockCategory[] = [];
  for (const service of demoServices) {
    if (categoryIds.has(service.category)) continue;
    const id = categoryIds.size + 1;
    categoryIds.set(service.category, id);
    categories.push({
      id,
      name: service.category,
      type: service.type.toLowerCase() as ServiceType,
      allowedGroupIds: [],
      sort: id,
      isActive: true,
    });
  }

  const services: MockService[] = demoServices.map((s) => ({
    id: demoNumericId(s.id),
    code: s.code,
    name: s.name,
    type: s.type.toLowerCase() as ServiceType,
    categoryId: categoryIds.get(s.category) ?? 0,
    cost: s.cost,
    costWas: s.costWas,
    price: s.price,
    minProfit: s.minProfit,
    slaMinutes: s.sla,
    supplierId: demoNumericId(s.sup),
    fallbackId: s.fb ? demoNumericId(s.fb) : null,
    status: s.status,
    auto: s.auto,
    fields: [],
    options: [],
    groupPrices: [],
  }));
  const byCode = (code: string) => services.find((service) => service.code === code);

  // The demo's two group service prices (`S.groupPrices`).
  const groupPrices = state.groupPrices as Record<string, number>;
  for (const [key, price] of Object.entries(groupPrices)) {
    const [group = '', code = ''] = key.split('|');
    byCode(code)?.groupPrices.push({ groupId: GROUP_IDS[group] ?? 1, price: price.toFixed(4) });
  }

  // A custom field on the Z3X credits and option lists on the AT&T unlock, so the dialogs have something to show.
  const z3x = byCode('SRV-Z3X-10');
  if (z3x) {
    z3x.fields = [
      {
        key: 'account',
        label: 'Z3X account',
        fieldType: 'text',
        required: true,
        options: [],
        regex: '',
        supplierKey: 'user',
      },
    ];
  }
  const att = byCode('IMEI-ATT-USA');
  if (att) {
    att.options = [
      { list: 'model', value: 'iphone15', label: 'iPhone 15', supplierValue: '' },
      { list: 'model', value: 'iphone14', label: 'iPhone 14', supplierValue: '' },
      { list: 'network', value: 'att', label: 'AT&T USA', supplierValue: 'ATT' },
    ];
  }

  // The demo's one category rule (`S.categoryRules`) as a pricing rule: a promo on Carrier unlock, 2% off.
  const rules: MockRule[] = Object.entries(state.categoryRules as Record<string, number>).map(
    ([category, adjustment], index) => ({
      id: index + 1,
      scope: 'category',
      targetId: categoryIds.get(category) ?? null,
      groupId: null,
      kind: adjustment < 0 ? 'discount' : 'margin',
      percent: Math.abs(adjustment) * 100,
      fixed: 0,
      rounding: 'none',
      minProfit: 0,
      priority: 100,
      isActive: true,
      startsAt: null,
      endsAt: null,
    }),
  );

  const now = Date.now();
  const z3xId = z3x?.id ?? 0;
  const utId = byCode('SRV-UT-1D')?.id ?? 0;
  const codes = [...codesFor(z3xId, 'Z3X', 18, 1, now), ...codesFor(utId, 'UT', 12, 19, now)];

  const clientPrices = new Map<string, number>();
  for (const [key, price] of Object.entries(state.clientPrices as Record<string, number>)) {
    const [merchant = '', code = ''] = key.split('|');
    const service = byCode(code);
    if (service) clientPrices.set(`${demoNumericId(merchant)}|${service.id}`, price);
  }

  return {
    services: new Collection(services),
    categories: new Collection(categories),
    rules: new Collection(rules),
    codes: new Collection(codes),
    groups: GROUPS,
    suppliers,
    merchants,
    clientPrices,
  };
}
