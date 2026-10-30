// Maps what the mock server keeps (the demo's numbers) to the API's shapes: a service with its worked-out floor, margin and
// "below floor", the service detail, a category, a rule and a masked inventory code.
import { toMoney } from '@/mocks/seed';
import type { InventoryCode, PricingRule, Service, ServiceCategory, ServiceDetail } from '../types';
import { floorOf, groupOf, isBelowFloor, marginOf } from './pricing';
import type { Stores } from './seed';
import type { MockCategory, MockCode, MockRule, MockService } from './types';

/** `GET /admin/services` row. */
export function toService(stores: Stores, row: MockService): Service {
  const category = stores.categories.find(row.categoryId);
  const supplier = row.supplierId === null ? undefined : stores.suppliers.get(row.supplierId);
  const fallback = row.fallbackId === null ? undefined : stores.suppliers.get(row.fallbackId);
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
    cost: toMoney(row.cost),
    costChangedFrom: row.costWas === null ? null : toMoney(row.costWas),
    minProfit: toMoney(row.minProfit),
    floorPrice: toMoney(floorOf(row)),
    marginPct: toMoney(marginOf(row)),
    belowFloor: isBelowFloor(row),
    slaMinutes: row.slaMinutes,
    supplier: row.supplierId !== null && supplier ? { id: row.supplierId, name: supplier } : null,
    fallbackSupplier: row.fallbackId !== null && fallback ? { id: row.fallbackId, name: fallback } : null,
  };
}

/** `GET /admin/services/:id`: the row plus its fields, options and group prices. */
export function toDetail(stores: Stores, row: MockService): ServiceDetail {
  return {
    ...toService(stores, row),
    fields: row.fields,
    options: row.options,
    groupPrices: row.groupPrices,
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
