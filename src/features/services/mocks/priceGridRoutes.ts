// Mock of the price grid and the order of services (`GET /admin/services/price-grid`, `POST /admin/services/order`, backend decision 063): the
// page of services with the cost, the base, shop and per-group prices and their margins, and the stored position of services. The mock plays the
// server: it prices every group the way the mock already resolves a price (pricing.ts), does the margin arithmetic that the real server does
// (a margin is the price minus the cost, null while no cost is on record), keeps the positions apart from the service rows, and answers 403 to
// a session without `pricing:read` (the grid) or `catalog:update` (the order), with the words of the backend's contract for the order.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { problem } from '@/mocks/problem';
import { toMoney } from '@/mocks/seed';
import { shopFactsReader, type ShopFacts } from '@/features/storefront/mocks';
import { chainFactsReader } from '@/features/suppliers/mocks';
import { applyListQuery } from '@/mocks/crud';
import type { PriceGridGroupPrice, PriceGridRow } from '../types';
import { covers, sessionPermissions } from './access';
import { bodyOf, idOf, invalid, signedIn } from './http';
import { costOf, resolve, round } from './pricing';
import type { Stores } from './seed';
import { servicesStore } from './store';
import type { MockService } from './types';

const SEARCH_FIELDS = ['name', 'code', 'category.name'];
const MAX_ORDER_ITEMS = 500;
const MAX_SORT = 1_000_000;
const RETAIL_KIND = 'b2c_retail';

// The positions staff gave, by service id, one map per store: the store is rebuilt on a reset, so the positions go with it.
const positions = new WeakMap<Stores, Map<number, number>>();

/** The saved position of a service (0 when none was set). */
function sortOf(stores: Stores, serviceId: number): number {
  return positions.get(stores)?.get(serviceId) ?? 0;
}

/**
 * The stored order over the service rows of a store, the one merchants see: the category's position, then the service's saved position, then
 * the name. The list of services reads it for `_sort=sort` (the All view), as the server sorts both reads by the same key.
 */
export function storedOrder(stores: Stores): (a: MockService, b: MockService) => number {
  const position = (row: MockService) => stores.categories.find(row.categoryId)?.sort ?? 0;
  return (a, b) =>
    position(a) - position(b) ||
    sortOf(stores, a.id) - sortOf(stores, b.id) ||
    a.name.localeCompare(b.name, undefined, { numeric: true });
}

/** A price minus the cost as signed money; null while no cost is on record (a new service starts at zero). */
function marginOver(service: MockService, priceNow: string | number): string | null {
  return costOf(service) === 0 ? null : toMoney(round(Number(priceNow) - costOf(service), 2));
}

/** One column per rank (kind b2b) in the groups' order: the fixed price, the price the resolver gives, and the margin. */
function groupCells(stores: Stores, service: MockService): PriceGridGroupPrice[] {
  const groups = stores.groups.filter((group) => group.kind !== RETAIL_KIND);
  const first = groups[0];
  const resolved = first
    ? (resolve(stores, service, { id: 0, name: 'grid', groupId: first.id }).otherGroups ?? [])
    : [];
  return groups.map((group) => {
    const priceNow = resolved.find((quote) => quote.group.id === group.id)?.price ?? toMoney(service.price);
    return {
      groupId: group.id,
      fixedPrice: service.groupPrices.find((entry) => entry.groupId === group.id)?.price ?? null,
      price: priceNow,
      margin: marginOver(service, priceNow),
    };
  });
}

/**
 * The shop price of a service. The group prices replace writes it as a row of the shop group; the accounts feature owns the groups, so a row
 * of a group the store does not list as a rank is the shop's. A row that only repeats the shop price the storefront mock holds is
 * a box nobody touched, so it does not turn a rule-made price into a typed one.
 */
function retailOf(stores: Stores, service: MockService, shop: ShopFacts) {
  const known = new Set(stores.groups.map((group) => group.id));
  const retailGroup = stores.groups.find((group) => group.kind === RETAIL_KIND);
  const stored = service.groupPrices.find((row) =>
    retailGroup ? row.groupId === retailGroup.id : !known.has(row.groupId),
  );
  const typed =
    stored !== undefined && (shop.retailPrice === null || Number(stored.price) !== Number(shop.retailPrice));
  if (stored && typed) return { price: stored.price, source: 'manual' as const };
  if (shop.retailPrice === null) return { price: null, source: null };
  return {
    price: shop.retailPrice,
    source: shop.retailPriceSource === 'rule' ? ('rule' as const) : ('manual' as const),
  };
}

/** A service as the grid sends it. */
function toGridRow(
  stores: Stores,
  service: MockService,
  shop: ShopFacts,
  supplier: { id: number; name: string } | null,
): PriceGridRow {
  const retail = retailOf(stores, service, shop);
  return {
    id: service.id,
    name: service.name,
    code: service.code,
    status: service.status,
    sort: sortOf(stores, service.id),
    categoryId: service.categoryId,
    supplier,
    cost: costOf(service) === 0 ? null : toMoney(costOf(service)),
    costChangedFrom: costOf(service) === 0 || service.costWas === null ? null : toMoney(service.costWas),
    basePrice: toMoney(service.price),
    baseMargin: marginOver(service, service.price),
    floorPrice: toMoney(round(costOf(service) + service.minProfit, 2)),
    belowFloor: service.price < round(costOf(service) + service.minProfit, 2) - 0.004,
    retailPrice: retail.price,
    retailPriceSource: retail.source,
    retailMargin: retail.price === null ? null : marginOver(service, retail.price),
    groupPrices: groupCells(stores, service),
  };
}

type Searchable = PriceGridRow & { type: string; category: { name: string }; categoryPosition: number };

// The order merchants see: category position, then the saved position, then the name (all in the direction asked for).
function byMerchantOrder(a: Searchable, b: Searchable): number {
  return (
    a.categoryPosition - b.categoryPosition ||
    a.sort - b.sort ||
    a.name.localeCompare(b.name, undefined, { numeric: true })
  );
}

/** The page asked for: filters and `q` as the other service routes read them, the sort the grid offers, then the range. */
function pageOf(rows: Searchable[], params: URLSearchParams) {
  const filters = new URLSearchParams(params);
  for (const key of ['_sort', '_order', '_start', '_end']) filters.delete(key);
  const { page: filtered } = applyListQuery(rows, filters, SEARCH_FIELDS);
  const field = params.get('_sort') ?? 'name';
  const direction = params.get('_order')?.toLowerCase() === 'desc' ? -1 : 1;
  const compare =
    field === 'sort'
      ? byMerchantOrder
      : field === 'id'
        ? (a: Searchable, b: Searchable) => a.id - b.id
        : (a: Searchable, b: Searchable) => a.name.localeCompare(b.name, undefined, { numeric: true });
  const sorted = [...filtered].sort((a, b) => direction * compare(a, b));
  const start = Number(params.get('_start') ?? 0);
  const end = params.has('_end') ? Number(params.get('_end')) : undefined;
  return { page: sorted.slice(start, end), total: sorted.length };
}

/** The price grid and the order route. */
export const priceGridRoutes: HttpHandler[] = [
  http.get('*/admin/services/price-grid', ({ request }) =>
    signedIn(request, async () => {
      if (!covers(await sessionPermissions(), 'pricing:read')) {
        return problem(
          403,
          'FORBIDDEN',
          'Forbidden',
          'You need the pricing:read permission to read the price grid.',
        );
      }
      const stores = await servicesStore();
      const [shopOf, chainOf] = await Promise.all([shopFactsReader(), chainFactsReader()]);
      const rows: Searchable[] = stores.services.list().map((service) => ({
        ...toGridRow(stores, service, shopOf(service.id), chainOf(service.id).primary),
        type: service.type,
        category: { name: stores.categories.find(service.categoryId)?.name ?? '' },
        categoryPosition: stores.categories.find(service.categoryId)?.sort ?? 0,
      }));
      const { page, total } = pageOf(rows, new URL(request.url).searchParams);
      const answer = page.map(
        ({ type: _type, category: _category, categoryPosition: _position, ...row }) => row,
      );
      return HttpResponse.json(answer, {
        headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
      });
    }),
  ),

  http.post('*/admin/services/order', ({ request }) =>
    signedIn(request, async () => {
      if (!covers(await sessionPermissions(), 'catalog:update')) {
        return problem(
          403,
          'FORBIDDEN',
          'Forbidden',
          'You need the catalog:update permission to change the order of services.',
        );
      }
      const stores = await servicesStore();
      const body = await bodyOf(request);
      const items = Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : [];
      if (items.length < 1) return invalid([{ field: 'items', message: 'Send at least one service.' }]);
      if (items.length > MAX_ORDER_ITEMS) {
        return invalid([{ field: 'items', message: `Send at most ${MAX_ORDER_ITEMS} services at a time.` }]);
      }
      const problems: { field: string; message: string }[] = [];
      const seen = new Set<number>();
      const parsed = items.map((item, index) => {
        const id = idOf(item.id);
        const sort = typeof item.sort === 'number' ? item.sort : Number.NaN;
        if (id === null || !stores.services.find(id)) {
          problems.push({ field: `items.${index}.id`, message: 'No service has this id.' });
        } else if (seen.has(id)) {
          problems.push({ field: `items.${index}.id`, message: 'Listed twice.' });
        } else seen.add(id);
        // The contract's three words, in its order: a whole number, at least 0, at most the top position.
        const refusal = !Number.isInteger(sort)
          ? 'Enter a whole number.'
          : sort < 0
            ? 'Enter 0 or more.'
            : sort > MAX_SORT
              ? `Use at most ${MAX_SORT}.`
              : null;
        if (refusal) problems.push({ field: `items.${index}.sort`, message: refusal });
        return { id: id ?? 0, sort };
      });
      if (problems.length > 0) return invalid(problems);
      const stored = positions.get(stores) ?? new Map<number, number>();
      positions.set(stores, stored);
      let updated = 0;
      for (const { id, sort } of parsed) {
        if (sortOf(stores, id) === sort) continue;
        stored.set(id, sort);
        updated += 1;
      }
      return HttpResponse.json({ updated });
    }),
  ),
];
