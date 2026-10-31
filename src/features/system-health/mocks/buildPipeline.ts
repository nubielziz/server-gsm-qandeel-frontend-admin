// The answers of `GET /admin/system/orders-health` (what an outage costs in orders and money) and
// `GET /admin/system/suppliers` (one health row per supplier of the suppliers mock). Dev and tests only.
import type { ServiceType } from '@/features/orders';
import type { MetricState, OrdersHealth, SupplierHealth, SuppliersHealth } from '../types';
import { MINUTE, SECOND, bucketStarts, iso, pick, stepOf, unit } from './clock';
import { allFacts, latencyMeasure, type Fact, type SupplierSource } from './facts';
import { SLOW_SUPPLIER_ID, onsetOf } from './profile';
import { nowOf, series, type Signal } from './signal';
import type { HealthState } from './state';
import { SPEC, measure } from './thresholds';

/** Money as the API sends it: whole cents in, four decimals out. */
export const money = (cents: number): string => (cents / 100).toFixed(4);

type PipelineFacts = {
  rows: { status: string; label: string; count: number; ageMin: number; cents: number }[];
  needsAttention: number;
  /** Dispatch p95 in seconds. */
  dispatch: number;
  /** Failure rate of finished orders (percent) and the number finished, per service type. */
  failure: Record<ServiceType, number>;
  totals: Record<ServiceType, number>;
  held: { count: number; cents: number; oldestMin: number | null };
};

const CALM: PipelineFacts = {
  rows: [{ status: 'processing', label: 'Processing', count: 1, ageMin: 52, cents: 2450 }],
  needsAttention: 3,
  dispatch: 14,
  failure: { imei: 1.2, server: 1.9, remote: 2.4, file: 0.8 },
  totals: { imei: 412, server: 186, remote: 64, file: 51 },
  held: { count: 2, cents: 8600, oldestMin: 130 },
};

// The slow supplier: 23 orders past their SLA holding $1,240.00, dispatch p95 of 4m 10s.
const SLOW: PipelineFacts = {
  rows: [
    { status: 'processing', label: 'Processing', count: 14, ageMin: 52, cents: 78_050 },
    { status: 'needs_attention', label: 'Needs attention', count: 6, ageMin: 41, cents: 33_625 },
    { status: 'pending', label: 'Pending', count: 3, ageMin: 27, cents: 12_325 },
  ],
  needsAttention: 9,
  dispatch: 250,
  failure: { imei: 11.2, server: 1.9, remote: 1.4, file: 0.8 },
  totals: { imei: 388, server: 179, remote: 61, file: 49 },
  held: { count: 3, cents: 14_500, oldestMin: 95 },
};

const TYPES: ServiceType[] = ['imei', 'server', 'remote', 'file'];

/** `GET /admin/system/orders-health`. */
export function buildOrdersHealth(state: HealthState, now: number): OrdersHealth {
  const facts = state.profile.slowSupplier ? SLOW : CALM;
  const total = facts.rows.reduce((sum, row) => sum + row.count, 0);
  const cents = facts.rows.reduce((sum, row) => sum + row.cents, 0);
  // Past SLA over the last 24 hours: one or two orders now and then, or a climb to today's count.
  const trend: Signal = {
    name: 'orders:stuck',
    calm: CALM.rows[0].count,
    day: 'flat',
    noise: state.profile.slowSupplier ? 0.1 : 1.6,
    stressed: state.profile.slowSupplier ? total : undefined,
    since: onsetOf(state.profile, state.anchor),
  };
  const dispatch: Signal = { name: 'orders:dispatch', calm: facts.dispatch, day: 'flat', noise: 0.04 };
  const starts = bucketStarts('24h', stepOf('metrics', '24h'), now);
  return {
    checkedAt: iso(now),
    stuck: {
      total: measure(SPEC.pastSla, total),
      heldAmount: money(cents),
      byStatus: facts.rows.map((row) => ({
        status: row.status,
        label: row.label,
        count: row.count,
        oldestAgeSeconds: Math.round((now - (state.anchor - row.ageMin * MINUTE)) / SECOND),
        heldAmount: money(row.cents),
      })),
      trend: series(trend, starts, stepOf('metrics', '24h'), now),
    },
    needsAttention: facts.needsAttention,
    dispatchP95: measure(SPEC.dispatch, nowOf(dispatch, now)),
    byServiceType: TYPES.map((type) => ({
      type,
      total: facts.totals[type],
      success: measure(SPEC.success, 100 - facts.failure[type]),
      failure: measure(SPEC.failure, facts.failure[type]),
    })),
    heldByRisk: {
      count: facts.held.count,
      amount: money(facts.held.cents),
      oldestAt: facts.held.oldestMin === null ? null : iso(state.anchor - facts.held.oldestMin * MINUTE),
    },
  };
}

// The server's low-balance verdict: warn under the alert amount (or when the days left run out), crit under a tenth of it.
function balanceState(row: SupplierSource): MetricState {
  const amount = Number(row.balance);
  const limit = Number(row.lowBalanceAlert);
  if (!Number.isFinite(amount)) return 'unknown';
  if (amount <= limit * 0.1) return 'crit';
  return amount < limit || row.lowBalance ? 'warn' : 'ok';
}

// One supplier's health row. Its rates follow the same trouble as its check, so the table and the history agree.
function toSupplierHealth(state: HealthState, row: SupplierSource, fact: Fact, now: number): SupplierHealth {
  const slow = state.profile.slowSupplier && row.id === SLOW_SUPPLIER_ID;
  const since = onsetOf(state.profile, state.anchor);
  const rate = (name: string, calm: number, stressed: number): Signal => ({
    name: `supplier:${row.id}:${name}`,
    calm,
    day: 'flat',
    noise: slow ? 0.04 : 0.15,
    ...(slow ? { stressed, since } : {}),
  });
  const checked = fact.checking;
  const minute = Math.floor(now / MINUTE);
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    health: fact.status,
    since: fact.since === null ? null : iso(fact.since),
    lastSuccessAt: !checked
      ? null
      : iso(
          slow ? now - 2 * MINUTE : minute * MINUTE - pick(`supplier:${row.id}:ok`, 3, 45, minute) * SECOND,
        ),
    latency: latencyMeasure(fact, now),
    errorRate: measure(
      SPEC.supplierErrors,
      checked ? nowOf(rate('errors', 0.4 + 1.2 * unit(`supplier:${row.id}:e`), 31.2), now) : null,
    ),
    timeoutRate: measure(
      SPEC.supplierErrors,
      checked ? nowOf(rate('timeouts', 0.2 + 0.7 * unit(`supplier:${row.id}:t`), 23.4), now) : null,
    ),
    circuit: slow ? 'open' : 'closed',
    lastSyncAt: row.balanceCheckedAt,
    balance: {
      amount: row.balance,
      currency: row.currency,
      state: balanceState(row),
      checkedAt: row.balanceCheckedAt,
    },
  };
}

/** `GET /admin/system/suppliers`: the rows of the suppliers mock, so a pause made on the Suppliers page shows here. */
export function buildSuppliers(
  state: HealthState,
  suppliers: SupplierSource[],
  now: number,
): SuppliersHealth {
  const facts = allFacts(state, suppliers);
  return {
    checkedAt: iso(now),
    suppliers: suppliers.flatMap((row) => {
      const fact = facts.find((candidate) => candidate.supplierId === row.id);
      return fact ? [toSupplierHealth(state, row, fact, now)] : [];
    }),
  };
}
