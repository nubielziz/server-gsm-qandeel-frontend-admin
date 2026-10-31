// Test fixtures of the Orders & suppliers tab: a small, complete answer for each of its two reads, so a test says exactly
// what the server says. Tests only.
import type { Measure, OrdersHealth, SupplierHealth, SuppliersHealth } from '../../types';

/** A measure with the state the "server" gave it. */
export function measure(
  value: number | null,
  unit: Measure['unit'],
  state: Measure['state'] = 'ok',
  extra: Partial<Measure> = {},
): Measure {
  return { value, unit, state, ...extra };
}

const MINUTE = 60_000;

/** A healthy, active supplier. Pass the fields a test cares about. */
export function supplier(over: Partial<SupplierHealth> = {}): SupplierHealth {
  const now = Date.now();
  return {
    id: 1,
    name: 'Nordic GSM',
    status: 'active',
    health: 'ok',
    since: null,
    lastSuccessAt: new Date(now - 2 * MINUTE).toISOString(),
    latency: measure(320, 'ms'),
    errorRate: measure(1.2, 'percent'),
    timeoutRate: measure(0.5, 'percent'),
    circuit: 'closed',
    lastSyncAt: new Date(now - 5 * MINUTE).toISOString(),
    balance: {
      amount: '1850.0000',
      currency: 'USD',
      state: 'ok',
      checkedAt: new Date(now - 5 * MINUTE).toISOString(),
    },
    ...over,
  };
}

/** The answer of `GET /admin/system/suppliers` for some suppliers. */
export function suppliersHealth(suppliers: SupplierHealth[]): SuppliersHealth {
  return { checkedAt: new Date().toISOString(), suppliers };
}

/** An order pipeline with nothing past SLA. Pass the fields a test cares about. */
export function ordersHealth(over: Partial<OrdersHealth> = {}): OrdersHealth {
  return {
    checkedAt: new Date().toISOString(),
    stuck: {
      total: measure(0, 'count', 'ok', { warn: 5, crit: 20, direction: 'above' }),
      heldAmount: '0.0000',
      byStatus: [],
      trend: [],
    },
    needsAttention: 0,
    dispatchP95: measure(13, 's', 'ok', { warn: 120, crit: 300, direction: 'above' }),
    byServiceType: [
      {
        type: 'imei',
        total: 40,
        success: measure(98.8, 'percent', 'ok', { warn: 97, crit: 90, direction: 'below' }),
        failure: measure(1.2, 'percent', 'ok', { warn: 3, crit: 10, direction: 'above' }),
      },
    ],
    heldByRisk: { count: 0, amount: '0.0000', oldestAt: null },
    ...over,
  };
}
