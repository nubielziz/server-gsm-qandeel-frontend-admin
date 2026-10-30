// The "Needs attention" list for the dev mock, as facts: which items exist, how severe, in what order. This is the server's
// job in the real API; the mock plays it with the demo's rules. Ports attention() of 11-state.js; the storefront's items are
// in `attentionStorefront.ts`, and the demo's withdrawals item is dropped (no admin route, MISMATCHES M3).
import { demoNumericId, toIso, toMoney } from '@/mocks/seed';
import type { AttentionItem, AttentionSeverity, DashboardScope } from '../types';
import { storefrontItems } from './attentionStorefront';
import { createdAt, inReview, inScope, isOpen, isPastSla } from './orderRules';
import { supplierMetrics } from './queues';
import { MINUTE, sumBy } from './util';
import type { World } from './world';

// Orders past SLA, and merchant orders waiting for a person.
function orderItems(world: World, scope: DashboardScope): AttentionItem[] {
  const open = world.orders.filter((order) => isOpen(order) && inScope(order, scope));
  const items: AttentionItem[] = [];
  const late = open
    .filter((order) => isPastSla(order, world.now))
    .sort((a, b) => createdAt(a) - createdAt(b));
  if (late.length) {
    const oldest = late[0];
    const target = oldest.service.slaMinutes * MINUTE;
    items.push({
      id: 'sla',
      severity: 'critical',
      kind: 'orders_past_sla',
      count: late.length,
      oldestOrderId: oldest.id,
      overdueSeconds: Math.max(0, world.now - createdAt(oldest) - target) / 1000,
      targetSeconds: target / 1000,
    });
  }
  // Merchant orders only: a held storefront order is its own item (the risk queue).
  const review = open.filter((order) => inReview(order) && order.channel === 'b2b');
  if (review.length) {
    const reasons = new Map<string | null, number>();
    for (const order of review) reasons.set(order.reviewReason, (reasons.get(order.reviewReason) ?? 0) + 1);
    const [topReason, topReasonCount] = [...reasons.entries()].sort((a, b) => b[1] - a[1])[0];
    items.push({
      id: 'review',
      severity: 'high',
      kind: 'orders_review',
      count: review.length,
      topReason,
      topReasonCount,
    });
  }
  return items;
}

// Suppliers that are switched on and down or degraded, and the ones running low on prepaid balance.
function supplierItems(world: World): AttentionItem[] {
  return world.suppliers
    .filter((supplier) => supplier.enabled)
    .flatMap((supplier) => {
      const id = demoNumericId(supplier.id);
      const metrics = supplierMetrics(world, supplier);
      const last = supplier.hist[supplier.hist.length - 1];
      const items: AttentionItem[] = [];
      if (supplier.status !== 'up') {
        items.push({
          id: `sup-${id}`,
          severity: supplier.status === 'down' ? 'critical' : 'high',
          kind: supplier.status === 'down' ? 'supplier_down' : 'supplier_degraded',
          supplierId: id,
          supplierName: supplier.name,
          successRate: last ? last.ok : null,
          openOrders: metrics.openOrders,
        });
      }
      if (metrics.low) {
        items.push({
          id: `bal-${id}`,
          severity: 'medium',
          kind: 'supplier_balance_low',
          supplierId: id,
          supplierName: supplier.name,
          balance: toMoney(metrics.balance),
          minimum: toMoney(supplier.minBalance),
          runwayDays: metrics.runwayDays,
        });
      }
      return items;
    });
}

// Services priced below cost plus minimum profit.
function floorItems(world: World): AttentionItem[] {
  const below = world.services.filter(
    (service) => service.status === 'active' && service.price < service.cost + service.minProfit - 0.004,
  );
  return below.length
    ? [
        {
          id: 'floor',
          severity: 'high',
          kind: 'services_below_floor',
          count: below.length,
          serviceNames: below.map((service) => service.name),
        },
      ]
    : [];
}

// Merchant-side items: deposits, negative wallets, accounts waiting for approval and commission accruals.
function merchantItems(world: World): AttentionItem[] {
  const items: AttentionItem[] = [];
  const deposits = world.payments.filter((payment) => payment.status === 'pending');
  if (deposits.length) {
    items.push({
      id: 'pay',
      severity: 'medium',
      kind: 'deposits_pending',
      count: deposits.length,
      total: toMoney(sumBy(deposits, (payment) => payment.net)),
      oldestAt: toIso(Math.min(...deposits.map((payment) => payment.created))),
    });
  }
  const negative = world.merchants
    .map((merchant) => ({ merchant, balance: world.wallets.get(demoNumericId(merchant.id)) ?? 0 }))
    .filter(({ balance }) => balance < 0);
  if (negative.length) {
    items.push({
      id: 'neg',
      severity: 'medium',
      kind: 'wallets_negative',
      count: negative.length,
      clients: negative.map(({ merchant, balance }) => ({
        id: demoNumericId(merchant.id),
        name: merchant.name,
        balance: toMoney(balance),
      })),
    });
  }
  const waiting = world.merchants.filter((merchant) => merchant.status === 'pending');
  if (waiting.length) {
    items.push({
      id: 'pend',
      severity: 'low',
      kind: 'merchants_pending',
      count: waiting.length,
      names: waiting.map((merchant) => merchant.name),
    });
  }
  const accrued = world.accruals.filter((accrual) => accrual.status === 'accrued');
  if (accrued.length) {
    items.push({
      id: 'comm',
      severity: 'low',
      kind: 'commissions_accrued',
      count: accrued.length,
      total: toMoney(sumBy(accrued, (accrual) => accrual.amount)),
      agents: new Set(accrued.map((accrual) => accrual.agent)).size,
    });
  }
  return items;
}

const RANK: Record<AttentionSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/** Every item for the channel, most urgent first (equal severities keep the order they were found in). */
export function attentionItems(world: World, scope: DashboardScope): AttentionItem[] {
  const items = [
    ...orderItems(world, scope),
    ...supplierItems(world),
    ...floorItems(world),
    // Merchant items belong to All and Merchants, storefront items to All and Storefront; the rest is shared.
    ...(scope !== 'b2c' ? merchantItems(world) : []),
    ...(scope !== 'b2b' ? storefrontItems(world) : []),
  ];
  return items.sort((a, b) => RANK[a.severity] - RANK[b.severity]);
}
