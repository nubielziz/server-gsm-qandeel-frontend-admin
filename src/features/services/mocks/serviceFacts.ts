// The Catalog join of the services mock: what a service row says about its supplier chain, its shop page, its shop price and what needs a
// person, worked out at request time from the suppliers and storefront mock stores (nothing is copied), and the Catalog filters of
// `GET /admin/services` (the stock, attention, supplier and shop ones). The mock plays the server: it leaves out the keys a session may not read and refuses a filter it may not use.
import { shopFactsReader, type ShopFacts } from '@/features/storefront/mocks';
import { chainFactsReader, type ChainFacts } from '@/features/suppliers/mocks';
import { invalid } from './http';
import { covers, forbidden, sessionPermissions } from './access';
import { isBelowFloor } from './pricing';
import type { Stores } from './seed';
import type { MockService } from './types';
import type { AttentionReason, ShopBlockReason } from '../types';

/** The two permissions the Catalog keys depend on, and the readers of the other two mocks, taken once per request. */
export type ServiceJoin = {
  /** `pricing:read`: the shop price's rule, the waiting flag and the `price_proposal` reason. */
  pricing: boolean;
  /** `storefront:read`: the shop page keys, the `publish_failed` reason, `publishFailure` and the shop filters. */
  storefront: boolean;
  shop: (serviceId: number) => ShopFacts;
  chain: (serviceId: number) => ChainFacts;
};

/** What the join knows about one service. `attention` lists only the reasons this session may see. */
export type RowFacts = {
  shop: ShopFacts;
  chain: ChainFacts;
  attention: AttentionReason[];
  shopBlocked: ShopBlockReason | null;
};

/** Reads the session's permissions and the two other mocks' stores. Call it once per request. */
export async function serviceJoin(): Promise<ServiceJoin> {
  const [granted, shop, chain] = await Promise.all([
    sessionPermissions(),
    shopFactsReader(),
    chainFactsReader(),
  ]);
  return {
    pricing: covers(granted, 'pricing:read'),
    storefront: covers(granted, 'storefront:read'),
    shop,
    chain,
  };
}

/**
 * Why the service cannot go on the shop, checked in the publish rules' order. The mock has no retail group, so a category with a group
 * list is closed to shop buyers; the storefront mock's locked listings (the demo's "B2B only" and "Service disabled" ones) say the same.
 */
function shopBlockOf(stores: Stores, row: MockService, shop: ShopFacts): ShopBlockReason | null {
  if (row.status === 'disabled') return 'service_disabled';
  const category = stores.categories.find(row.categoryId);
  if (category && !category.isActive) return 'category_inactive';
  const retail = stores.groups.find((group) => group.kind === 'b2c_retail');
  const closed =
    category !== undefined &&
    category.allowedGroupIds.length > 0 &&
    !(retail !== undefined && category.allowedGroupIds.includes(retail.id));
  if (shop.locked || closed) return 'b2b_only';
  return row.type === 'file' ? 'not_orderable' : null;
}

/** How many of a service's codes are `available` now (0 for a service with no codes): the row's `stockAvailable`. */
export function stockAvailableOf(stores: Stores, serviceId: number): number {
  return stores.codes.list().filter((code) => code.serviceId === serviceId && code.status === 'available')
    .length;
}

/**
 * The reasons a live service needs a person, in the server's order, limited to the ones this session may see. A service delivered from
 * code stock with at least one available code counts as supplied, as on the server: it gets no `no_supplier` even with no supplier link.
 */
function attentionOf(
  row: MockService,
  join: ServiceJoin,
  shop: ShopFacts,
  chain: ChainFacts,
  stockLeft: number,
): AttentionReason[] {
  if (row.status !== 'active') return [];
  const reasons: AttentionReason[] = [];
  const supplied = chain.linked || (row.stockDelivery && stockLeft > 0);
  if (row.auto && !supplied) reasons.push('no_supplier');
  if (isBelowFloor(row)) reasons.push('below_floor');
  if (join.pricing && shop.proposalWaiting) reasons.push('price_proposal');
  if (join.storefront && shop.publishFailure !== null) reasons.push('publish_failed');
  return reasons;
}

/** Everything the join says about one service, as the request sees it. */
export function factsOf(stores: Stores, row: MockService, join: ServiceJoin): RowFacts {
  const shop = join.shop(row.id);
  const chain = join.chain(row.id);
  return {
    shop,
    chain,
    attention: attentionOf(row, join, shop, chain, stockAvailableOf(stores, row.id)),
    shopBlocked: shopBlockOf(stores, row, shop),
  };
}

/** The Catalog filters of a request, each only when it was sent. */
export type MockListFilters = {
  stockDelivery?: boolean;
  needsAttention?: boolean;
  hasSupplier?: boolean;
  supplierId?: number;
  isListed?: boolean;
  notOnShop?: boolean;
};

const BOOLEAN_FILTERS = ['stockDelivery', 'needsAttention', 'hasSupplier', 'isListed', 'notOnShop'] as const;
const FILTER_NAMES: string[] = [...BOOLEAN_FILTERS, 'supplierId'];
const OPERATOR_SUFFIXES = ['_gte', '_lte', '_ne', '_gt', '_lt', '_like'];

/**
 * Splits the Catalog filters out of a list query. Answers a Response when the query is refused: 422 for a value that is not
 * `true`, `false` or a whole id, or an operator (they take only `eq`), then 403 for `isListed` or `notOnShop` without
 * `storefront:read`. Otherwise `rest` is the query without them, for the generic filters, search, sort and range.
 */
export function readListFilters(
  params: URLSearchParams,
  join: ServiceJoin,
): Response | { filters: MockListFilters; rest: URLSearchParams } {
  const rest = new URLSearchParams(params);
  const filters: MockListFilters = {};
  const errors: { field: string; message: string }[] = [];
  for (const key of params.keys()) {
    const field = FILTER_NAMES.find((name) => OPERATOR_SUFFIXES.some((suffix) => key === name + suffix));
    if (field) errors.push({ field: key, message: `${field} takes only an exact value.` });
  }
  for (const name of FILTER_NAMES) {
    const values = params.getAll(name);
    if (values.length === 0) continue;
    rest.delete(name);
    const value = values[0] ?? '';
    if (values.length > 1) errors.push({ field: name, message: 'Send one value.' });
    else if (name === 'supplierId') {
      if (/^[1-9]\d*$/.test(value)) filters.supplierId = Number(value);
      else errors.push({ field: name, message: 'Use a whole number.' });
    } else if (value === 'true' || value === 'false') {
      filters[name as (typeof BOOLEAN_FILTERS)[number]] = value === 'true';
    } else errors.push({ field: name, message: 'Use true or false.' });
  }
  if (errors.length > 0) return invalid(errors);
  if (!join.storefront) {
    if (filters.isListed !== undefined) return forbidden('storefront:read', 'isListed');
    if (filters.notOnShop !== undefined) return forbidden('storefront:read', 'notOnShop');
  }
  return { filters, rest };
}

/** An active service that is not on the shop and that nothing blocks: what the `notOnShop` filter keeps. */
export function isNotOnShop(row: MockService, facts: RowFacts): boolean {
  return row.status === 'active' && !facts.shop.isListed && facts.shopBlocked === null;
}

/** Whether a service passes the Catalog filters of a request. */
export function passesListFilters(filters: MockListFilters, row: MockService, facts: RowFacts): boolean {
  const { stockDelivery, needsAttention, hasSupplier, supplierId, isListed, notOnShop } = filters;
  const needsAPerson = facts.attention.length > 0;
  return (
    (stockDelivery === undefined || row.stockDelivery === stockDelivery) &&
    (needsAttention === undefined || needsAPerson === needsAttention) &&
    (hasSupplier === undefined || facts.chain.linked === hasSupplier) &&
    (supplierId === undefined || facts.chain.primary?.id === supplierId) &&
    (isListed === undefined || facts.shop.isListed === isListed) &&
    (notOnShop === undefined || isNotOnShop(row, facts) === notOnShop)
  );
}
