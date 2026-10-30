// The pricing the mock server does, as the demo did in the browser: the floor, the margin, "below floor", the price resolver
// (`resolveWith` in 10-data.js) and a bulk change. This is the only place with price maths: the console reads the results.
import { toMoney } from '@/mocks/seed';
import type { GroupQuote, PriceResolution, PriceStep } from '../types';
import type { MockGroup, MockMerchant, MockRule, MockService } from './types';
import type { Stores } from './seed';

/** Rounds to `decimals` places, like the demo's `round`. */
export const round = (value: number, decimals = 2): number =>
  Math.round(value * 10 ** decimals) / 10 ** decimals;

/** Supplier cost plus the minimum profit (the demo's `floorOf`). */
export const floorOf = (service: MockService): number => round(service.cost + service.minProfit, 2);

/** The demo's test: the price is under the floor by more than rounding noise. */
export const isBelowFloor = (service: MockService, price = service.price): boolean =>
  price < floorOf(service) - 0.004;

/** Margin of a price over the cost, in percent (the demo's `marginOf`). */
export const marginOf = (service: MockService, price = service.price): number =>
  ((price - service.cost) / price) * 100;

/**
 * A merchant group by id. The merchants feature owns the groups (their ids, names and discounts), so the mock must cope with an id it
 * does not know: that group is named "Group #<id>" and has no discount.
 */
export function groupOf(stores: Stores, id: number): MockGroup {
  return (
    stores.groups.find((candidate) => candidate.id === id) ?? {
      id,
      name: `Group #${id}`,
      kind: 'b2b',
      discountPercent: 0,
    }
  );
}

/** The category rule that applies to a service for a group, as a signed fraction (`-0.02` is 2% off), or 0. */
function categoryAdjustment(stores: Stores, service: MockService, groupId: number): number {
  const rule = stores.rules
    .list()
    .filter(
      (candidate: MockRule) =>
        candidate.isActive &&
        candidate.scope === 'category' &&
        candidate.targetId === service.categoryId &&
        (candidate.groupId === null || candidate.groupId === groupId),
    )
    .sort((a, b) => a.priority - b.priority)[0];
  if (!rule) return 0;
  return (rule.kind === 'margin' ? 1 : -1) * (rule.percent / 100);
}

type Quote = {
  price: number;
  raw: number;
  clamped: boolean;
  source: 'client' | 'group' | 'base';
  steps: PriceStep[];
};

/** The resolver for one group and an optional merchant override (the demo's `resolveWith`). */
function quote(stores: Stores, service: MockService, groupId: number, override: number | undefined): Quote {
  const floor = floorOf(service);
  const group = groupOf(stores, groupId);
  const groupPrice = service.groupPrices.find((entry) => entry.groupId === groupId);
  const gp = groupPrice ? Number(groupPrice.price) : undefined;
  const cat = categoryAdjustment(stores, service, groupId);
  const discount = group.discountPercent / 100;
  const categoryName = stores.categories.find(service.categoryId)?.name ?? 'this category';
  const fixed = override !== undefined || gp !== undefined;
  const skipped = 'Skipped, a fixed price applies';
  const steps: PriceStep[] = [
    {
      id: 'client',
      label: 'Client override',
      state: override !== undefined ? 'win' : 'none',
      value: override ?? null,
      after: override ?? null,
      note: override !== undefined ? 'Fixed price set for this merchant' : 'None for this merchant',
    },
    {
      id: 'group',
      label: 'Group service price',
      state: override !== undefined ? 'skip' : gp !== undefined ? 'win' : 'none',
      value: gp ?? null,
      after: override === undefined && gp !== undefined ? gp : null,
      note:
        override !== undefined
          ? 'Skipped, client override wins'
          : gp !== undefined
            ? `${group.name} price for this service`
            : `None for the ${group.name} group`,
    },
    {
      id: 'base',
      label: 'Base price',
      state: fixed ? 'skip' : 'apply',
      value: service.price,
      after: fixed ? null : round(service.price, 2),
      note: fixed
        ? skipped
        : `Cost ${toMoney(service.cost)} plus ${round((service.price / service.cost - 1) * 100, 1)}% markup`,
    },
  ];
  let running = fixed ? (override ?? gp ?? service.price) : service.price;
  if (!fixed && cat) running *= 1 + cat;
  steps.push({
    id: 'category',
    label: 'Category rule',
    state: fixed ? 'skip' : cat ? 'apply' : 'none',
    value: cat || null,
    after: !fixed && cat ? round(running, 2) : null,
    note: fixed
      ? skipped
      : cat
        ? `${categoryName} ${cat > 0 ? '+' : '-'}${round(Math.abs(cat * 100), 2)}%`
        : `No rule for ${categoryName}`,
  });
  if (!fixed && discount) running *= 1 - discount;
  steps.push({
    id: 'discount',
    label: 'Group discount',
    state: fixed ? 'skip' : discount ? 'apply' : 'none',
    value: discount || null,
    after: !fixed && discount ? round(running, 2) : null,
    note: fixed
      ? skipped
      : discount
        ? `${group.name} group -${group.discountPercent}%`
        : `${group.name} group has no discount`,
  });
  const raw = round(running, 2);
  return {
    price: raw < floor ? floor : raw,
    raw,
    clamped: raw < floor,
    source: override !== undefined ? 'client' : gp !== undefined ? 'group' : 'base',
    steps,
  };
}

/** `GET /admin/pricing/resolve` for a service and a merchant, with the same service's price for every group. */
export function resolve(stores: Stores, service: MockService, merchant: MockMerchant): PriceResolution {
  const own = quote(
    stores,
    service,
    merchant.groupId,
    stores.clientPrices.get(`${merchant.id}|${service.id}`),
  );
  const otherGroups: GroupQuote[] = stores.groups.map((group) => {
    const other = quote(stores, service, group.id, undefined);
    return { group: { id: group.id, name: group.name }, price: toMoney(other.price), clamped: other.clamped };
  });
  const margin = round(own.price - service.cost, 2);
  return {
    price: toMoney(own.price),
    rawPrice: toMoney(own.raw),
    floor: toMoney(floorOf(service)),
    clamped: own.clamped,
    source: own.source,
    cost: toMoney(service.cost),
    minProfit: toMoney(service.minProfit),
    margin: toMoney(margin),
    marginPct: toMoney(own.price > 0 ? (margin / own.price) * 100 : 0),
    steps: own.steps,
    otherGroups,
  };
}

/** The price a bulk change gives one service: a percentage of the price or a fixed amount added, rounded to cents. */
export function changedPrice(price: number, type: 'percent' | 'fixed', value: number): number {
  return round(type === 'percent' ? price * (1 + value / 100) : price + value, 2);
}
