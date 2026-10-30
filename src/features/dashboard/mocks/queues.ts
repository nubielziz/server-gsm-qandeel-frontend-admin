// The open queue by service type and the supplier health table. Ports queueByType() and supMetrics() of 11-state.js, and
// the table rows of supplierPanel() in 40-p-dashboard.js (the last reading of the supplier's hourly history).
import { demoNumericId, toIso, toMoney } from '@/mocks/seed';
import type { ServiceType } from '@/features/orders';
import type { DashboardScope, QueueByType, SupplierHealth } from '../types';
import { createdAt, inReview, inScope, isOpen, isPastSla } from './orderRules';
import { DAY, sumBy } from './util';
import type { SeedSupplier, World } from './world';

const TYPES: readonly ServiceType[] = ['imei', 'server', 'remote', 'file'];

/** Open orders per service type for the channel: how many, how many wait for a person, how many are late, and the oldest. */
export function queuesByType(world: World, scope: DashboardScope): QueueByType[] {
  return TYPES.map((type) => {
    const open = world.orders.filter(
      (order) => isOpen(order) && order.service.type === type && inScope(order, scope),
    );
    const oldest = open.length ? Math.min(...open.map(createdAt)) : null;
    return {
      type,
      open: open.length,
      review: open.filter(inReview).length,
      pastSla: open.filter((order) => isPastSla(order, world.now)).length,
      oldestCreatedAt: oldest === null ? null : toIso(oldest),
    };
  });
}

export type SupplierMetrics = {
  openOrders: number;
  balance: number;
  /** Days of volume the balance covers at the last 7 days' cost rate; null when nothing was spent. */
  runwayDays: number | null;
  /** Below the minimum balance, or less than two days of volume left. */
  low: boolean;
};

/** Open orders, balance and runway of one supplier. */
export function supplierMetrics(world: World, supplier: SeedSupplier): SupplierMetrics {
  const id = demoNumericId(supplier.id);
  const spent = sumBy(
    world.orders.filter(
      (order) =>
        order.status === 'completed' &&
        order.supplier?.id === id &&
        world.now - Date.parse(order.completedAt ?? '') < 7 * DAY,
    ),
    (order) => Number(order.totalCost),
  );
  const burn = spent / 7;
  const balance = world.prepaid.get(id) ?? 0;
  return {
    openOrders: world.orders.filter((order) => isOpen(order) && order.supplier?.id === id).length,
    balance,
    runwayDays: burn > 0 ? balance / burn : null,
    low: balance < supplier.minBalance || (burn > 0 && balance / burn < 2),
  };
}

/** One row per supplier: its last health reading and prepaid balance. */
export function supplierHealth(world: World): SupplierHealth[] {
  return world.suppliers.map((supplier) => {
    const last = supplier.hist[supplier.hist.length - 1];
    const metrics = supplierMetrics(world, supplier);
    return {
      id: demoNumericId(supplier.id),
      name: supplier.name,
      enabled: supplier.enabled,
      health: supplier.status,
      successRate1h: last ? last.ok : null,
      p50Ms: last?.ms ? last.ms : null,
      balance: toMoney(metrics.balance),
      lowBalance: metrics.low,
    };
  });
}
