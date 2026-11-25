// Maps what the mock server keeps (the demo's numbers) to the API's shapes: a service with its worked-out floor, margin and
// "below floor" and the Catalog join (supplier chain, shop page and price, what needs attention), the service detail, a category, a
// rule and a masked inventory code.
import { toMoney } from '@/mocks/seed';
import type { InventoryCode, PricingRule, Service, ServiceCategory, ServiceDetail } from '../types';
import { factsOf, stockAvailableOf, type ServiceJoin } from './serviceFacts';
import { costOf, floorOf, groupOf, isBelowFloor, marginOf } from './pricing';
import type { Stores } from './seed';
import type { MockCategory, MockCode, MockRule, MockService } from './types';

/**
 * `GET /admin/services` row (also the answer of create and change). `cost` is the cost used (the larger of the service's own cost and the
 * supplier's), `stockAvailable` counts its available codes. The supplier names, the shop page and price and the attention
 * reasons are joined from the other mocks at this moment; a key the session may not read is left out, never `null` or `false`.
 */
export function toService(stores: Stores, row: MockService, join: ServiceJoin): Service {
  const category = stores.categories.find(row.categoryId);
  const { shop, chain, attention, shopBlocked } = factsOf(stores, row, join);
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    type: row.type,
    status: row.status,
    executionMode: row.auto ? 'auto' : 'manual',
    categoryId: row.categoryId,
    category: category ? { id: category.id, name: category.name } : null,
    basePrice: toMoney(row.price),
    cost: toMoney(costOf(row)),
    ownCost: toMoney(row.ownCost),
    stockDelivery: row.stockDelivery,
    stockAvailable: stockAvailableOf(stores, row.id),
    costChangedFrom: row.costWas === null ? null : toMoney(row.costWas),
    minProfit: toMoney(row.minProfit),
    floorPrice: toMoney(floorOf(row)),
    marginPct: toMoney(marginOf(row)),
    belowFloor: isBelowFloor(row),
    slaMinutes: row.slaMinutes,
    minQty: row.minQty,
    maxQty: row.maxQty,
    qtyOptions: row.qtyOptions,
    allowCancel: row.allowCancel,
    allowVerify: row.allowVerify,
    verifyWindowH: row.verifyWindowH,
    supplier: chain.primary,
    fallbackSupplier: chain.fallback,
    attention,
    retailPrice: shop.retailPrice,
    retailPriceSource: shop.retailPriceSource,
    // The waiting flag is false for a service with no shop price, as the server's own read says; the attention reason is not.
    ...(join.pricing
      ? {
          retailPriceRule: shop.retailPriceRule,
          retailPriceWaiting: shop.retailPrice !== null && shop.proposalWaiting,
        }
      : {}),
    ...(join.storefront ? { listingId: shop.listingId, isListed: shop.isListed, shopBlocked } : {}),
  };
}

/** `GET /admin/services/:id`: the row plus its fields, options and group prices, and the failed publish with `storefront:read`. */
export function toDetail(stores: Stores, row: MockService, join: ServiceJoin): ServiceDetail {
  return {
    ...toService(stores, row, join),
    fields: row.fields,
    options: row.options,
    groupPrices: row.groupPrices,
    ...(join.storefront ? { publishFailure: join.shop(row.id).publishFailure } : {}),
  };
}

/** A category row, with the number of services in it. */
export function toCategory(stores: Stores, row: MockCategory): ServiceCategory {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    allowedGroupIds: row.allowedGroupIds,
    sort: row.sort,
    isActive: row.isActive,
    serviceCount: stores.services.list().filter((service) => service.categoryId === row.id).length,
  };
}

/** A pricing rule row, with the target and group names joined. */
export function toRule(stores: Stores, row: MockRule): PricingRule {
  const target =
    row.scope === 'category'
      ? stores.categories.find(row.targetId ?? 0)
      : row.scope === 'service'
        ? stores.services.find(row.targetId ?? 0)
        : undefined;
  const group = row.groupId === null ? undefined : groupOf(stores, row.groupId);
  return {
    id: row.id,
    scope: row.scope,
    targetId: row.targetId,
    target: target ? { id: target.id, name: target.name } : null,
    groupId: row.groupId,
    group: group ? { id: group.id, name: group.name } : null,
    kind: row.kind,
    percent: toMoney(row.percent),
    fixed: toMoney(row.fixed),
    rounding: row.rounding,
    minProfit: toMoney(row.minProfit),
    priority: row.priority,
    isActive: row.isActive,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
  };
}

/** An inventory code with everything but its last four characters masked. */
export function toCode(stores: Stores, row: MockCode): InventoryCode & { serviceId: number } {
  const service = stores.services.find(row.serviceId);
  return {
    id: row.id,
    serviceId: row.serviceId,
    service: { id: row.serviceId, name: service?.name ?? `Service ${row.serviceId}` },
    maskedCode: '•'.repeat(Math.max(0, row.code.length - 4)) + row.code.slice(-4),
    status: row.status,
    orderId: row.orderId,
    batchRef: row.batchRef,
    createdAt: row.createdAt,
  };
}
