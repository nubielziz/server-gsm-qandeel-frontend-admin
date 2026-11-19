// The Retail pricing tab's mock data: four rules, seven price changes (three of them proposals that wait), who wrote each storefront
// price, and the fixed price a rule gives each listed service. The mock does no price arithmetic (M92): every figure below is typed in,
// the way a server's answer would read, and the routes only hand them out. Ids follow the demo's services (s5 is AT&T USA Premier Unlock, s10 Orange France Unlock).
import { Collection } from '@/mocks/db';
import { toIso } from '@/mocks/seed';
import type { MockRetailChange, MockRetailRule, MockService, PricingStores } from './types';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** The rules a shop owner would have made: a global one, IMEI +30%, Carrier unlock +20% and an unused server rule (off). */
function rules(now: number, carrierUnlock: number): MockRetailRule[] {
  const base = { fixed: '0.0000', roundFrom: '5.0000', updatedAt: toIso(now - 2 * DAY) };
  return [
    {
      ...base,
      id: 1,
      scope: 'global',
      serviceType: null,
      categoryId: null,
      percent: '25.0000',
      rounding: 'ends_99',
      autoFollowPercent: 25,
      isActive: true,
      following: 3,
    },
    {
      ...base,
      id: 2,
      scope: 'type',
      serviceType: 'imei',
      categoryId: null,
      percent: '30.0000',
      rounding: 'cent',
      autoFollowPercent: 25,
      isActive: true,
      following: 4,
    },
    {
      ...base,
      id: 3,
      scope: 'category',
      serviceType: null,
      categoryId: carrierUnlock,
      percent: '20.0000',
      fixed: '0.5000',
      rounding: 'step_0.05',
      autoFollowPercent: 15,
      isActive: true,
      following: 4,
    },
    {
      ...base,
      id: 4,
      scope: 'type',
      serviceType: 'server',
      categoryId: null,
      percent: '15.0000',
      rounding: 'cent',
      autoFollowPercent: 25,
      isActive: false,
      following: 0,
    },
  ];
}

/** The price changes, oldest first; ids 5, 6 and 7 are the proposals that wait (id 5 answers `changed` when it is applied). */
function changes(now: number): MockRetailChange[] {
  const row = (
    id: number,
    serviceId: number,
    kind: MockRetailChange['kind'],
    reason: MockRetailChange['reason'],
    figures: Pick<MockRetailChange, 'oldPrice' | 'newPrice' | 'oldCost' | 'newCost'>,
    ruleId: number | null,
    ageMs: number,
    extra: Partial<MockRetailChange> = {},
  ): MockRetailChange => ({
    id,
    serviceId,
    kind,
    reason,
    ...figures,
    ruleId,
    waiting: false,
    resolution: null,
    resolvedAt: null,
    resolvedBy: null,
    createdAt: toIso(now - ageMs),
    ...extra,
  });
  return [
    row(
      1,
      13,
      'detached',
      'changed_elsewhere',
      { oldPrice: '12.9900', newPrice: '14.9900', oldCost: '7.5000', newCost: '7.5000' },
      2,
      6 * DAY,
    ),
    row(
      2,
      8,
      'followed',
      'floor_changed',
      { oldPrice: '14.4900', newPrice: '14.9900', oldCost: '7.2000', newCost: '7.2000' },
      3,
      5 * DAY,
    ),
    row(
      3,
      7,
      'followed',
      'rule_changed',
      { oldPrice: '10.9900', newPrice: '11.9900', oldCost: '5.6000', newCost: '5.6000' },
      3,
      4 * DAY,
    ),
    row(
      4,
      6,
      'followed',
      'cost_changed',
      { oldPrice: '18.9900', newPrice: '19.9900', oldCost: '9.2000', newCost: '9.8000' },
      3,
      2 * DAY,
    ),
    row(
      5,
      10,
      'proposed',
      'cost_jump',
      { oldPrice: '21.9900', newPrice: '27.9900', oldCost: '11.2000', newCost: '17.5000' },
      3,
      3 * HOUR,
      { waiting: true, movedTo: '28.4900' },
    ),
    row(
      6,
      8,
      'proposed',
      'no_cost',
      { oldPrice: '14.9900', newPrice: null, oldCost: '7.2000', newCost: '0.0000' },
      3,
      2 * HOUR,
      { waiting: true },
    ),
    row(
      7,
      6,
      'proposed',
      'cost_jump',
      { oldPrice: '19.9900', newPrice: '24.9900', oldCost: '9.8000', newCost: '15.1000' },
      3,
      HOUR,
      { waiting: true },
    ),
  ];
}

// What the rules give each listed service (the demo's S.retail is the price today; a few differ so "Follow the pricing rule" shows a change).
const RULE_PRICES: Record<number, string> = {
  1: '3.9900',
  2: '3.9900',
  3: '3.9900',
  4: '3.9900',
  5: '25.9900',
  6: '19.9900',
  7: '11.9900',
  8: '14.9900',
  9: '12.9900',
  10: '21.9900',
  11: '44.5000',
  12: '57.0000',
  13: '15.5000',
  14: '8.5000',
};

/** The Retail pricing stores. `categories` is the category names by id, as the services mock numbers them. */
export function buildPricingStores(
  services: ReadonlyMap<number, MockService>,
  categories: ReadonlyMap<number, string>,
  now: number,
): PricingStores {
  const carrierUnlock = [...categories].find(([, name]) => name === 'Carrier unlock')?.[0] ?? 0;
  const sources: PricingStores['sources'] = new Map();
  // Who wrote each price today: the IMEI rule wrote the four cheap checks, the category rule four carrier unlocks (the others,
  // AT&T and EE, were typed), and people the rest.
  const byRule = new Map([
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2],
    [6, 3],
    [7, 3],
    [8, 3],
    [10, 3],
  ]);
  for (const id of services.keys()) {
    if (id > 14) continue;
    const ruleId = byRule.get(id);
    sources.set(id, ruleId === undefined ? { source: 'manual', ruleId: null } : { source: 'rule', ruleId });
  }
  const line = (
    serviceId: number,
    cost: string,
    floorPrice: string,
    currentPrice: string,
    newPrice: string,
    atFloor: boolean,
  ) => {
    const service = services.get(serviceId);
    return {
      serviceId,
      name: service?.name ?? `Service ${serviceId}`,
      code: service?.code ?? '',
      cost,
      floorPrice,
      currentPrice,
      newPrice,
      atFloor,
    };
  };
  return {
    rules: new Collection(rules(now, carrierUnlock)),
    changes: new Collection(changes(now)),
    sources,
    rulePrices: new Map(Object.entries(RULE_PRICES).map(([id, price]) => [Number(id), price])),
    categories,
    previewLines: [
      line(5, '13.5000', '19.0100', '25.9900', '27.9900', false),
      line(6, '9.8000', '14.0100', '19.9900', '20.9900', false),
      line(7, '5.6000', '8.3100', '11.9900', '8.3100', true),
    ],
  };
}
