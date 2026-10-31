// Order pipeline and supplier health: `GET /admin/system/orders-health` and `GET /admin/system/suppliers`.
// Pausing a supplier is the suppliers feature's `PATCH /admin/suppliers/:id` (status = paused). Assumed contract.
import type { Id, IsoDateTime, Money } from '@/lib/api';
import type { ServiceType } from '@/features/orders';
import type { SupplierStatus } from '@/features/suppliers';
import type { CheckStatus, Measure, MetricState, SeriesPoint } from './common';

/** Orders past their SLA in one order status. */
export interface StuckStatusRow {
  /** The order status as the orders API names it ("processing", "needs_attention"). */
  status: string;
  label: string;
  count: number;
  /** Age of the oldest one, in seconds. */
  oldestAgeSeconds: number | null;
  /** Money held for these orders (merchant wallet holds and paid storefront orders). */
  heldAmount: Money;
}

/** Success and failure of finished orders of one service type over the last 24 hours. */
export interface ServiceTypeHealth {
  type: ServiceType;
  total: number;
  success: Measure;
  failure: Measure;
}

/** Answer of `GET /admin/system/orders-health`: what an outage costs in orders and money. */
export interface OrdersHealth {
  checkedAt: IsoDateTime;
  /** Orders past SLA: the count with its state, the money held, the split by status and the last 24 hours. */
  stuck: { total: Measure; heldAmount: Money; byStatus: StuckStatusRow[]; trend: SeriesPoint[] };
  /** Orders waiting for staff (`needs_attention`). */
  needsAttention: number;
  /** Time from accepted to sent to the supplier, p95, in seconds. */
  dispatchP95: Measure;
  byServiceType: ServiceTypeHealth[];
  /** Paid storefront orders held by the risk rules. */
  heldByRisk: { count: number; amount: Money; oldestAt: IsoDateTime | null };
}

/** State of a supplier's circuit breaker: `open` means calls are stopped after repeated failures. */
export type CircuitState = 'closed' | 'open' | 'half_open';

/** Health of one supplier connection. `status` is the switch (active, disabled, paused); `health` the checks. */
export interface SupplierHealth {
  id: Id;
  name: string;
  status: SupplierStatus;
  health: CheckStatus;
  /** When the current health began. */
  since: IsoDateTime | null;
  lastSuccessAt: IsoDateTime | null;
  latency: Measure;
  errorRate: Measure;
  timeoutRate: Measure;
  circuit: CircuitState;
  lastSyncAt: IsoDateTime | null;
  /** Our balance with the supplier; `state` is the server's low-balance verdict. */
  balance: { amount: Money; currency: string; state: MetricState; checkedAt: IsoDateTime | null };
}

/** Answer of `GET /admin/system/suppliers`. */
export interface SuppliersHealth {
  checkedAt: IsoDateTime;
  suppliers: SupplierHealth[];
}
