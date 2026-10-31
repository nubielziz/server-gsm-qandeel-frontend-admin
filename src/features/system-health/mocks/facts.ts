// What the checks say about each component of the platform in a scenario: core services, payment gateways and the
// suppliers of the suppliers mock. The health summary, the check history and the supplier table are all made from these
// facts, so they cannot disagree. Dev and tests only.
import type { Supplier } from '@/features/suppliers';
import type {
  AlertEvent,
  CheckStatus,
  ComponentKind,
  HealthComponent,
  Measure,
  OverallStatus,
} from '../types';
import { DAY, HOUR, MINUTE, iso, pick } from './clock';
import { SLOW_SUPPLIER_ID, onsetOf } from './profile';
import type { Signal } from './signal';
import { nowOf } from './signal';
import { CORE, GATEWAYS, SUPPLIER_CALM_MS, SUPPLIER_LIMITS, type ComponentSpec } from './specs';
import type { HealthState } from './state';
import { measure } from './thresholds';
import { componentUptime } from './history';

/** The columns of a supplier row the mock reads from the suppliers mock store. */
export type SupplierSource = Pick<
  Supplier,
  'id' | 'name' | 'status' | 'balance' | 'currency' | 'balanceCheckedAt' | 'lowBalanceAlert' | 'lowBalance'
>;

/**
 * What the checks say about one component in the scenario. The health summary, the check history and the supplier
 * table are all made from facts, so they cannot disagree.
 */
export type Fact = {
  key: string;
  name: string;
  kind: ComponentKind;
  supplierId: number | null;
  gatewayId: number | null;
  status: CheckStatus;
  /** When the current status began (ms); null when there is no check. */
  since: number | null;
  detail: string | null;
  limits: { warn: number; crit: number };
  /** The response time of the check over time. */
  signal: Signal;
  /** A down check gets no answer at all (connection refused), so it has no response time. */
  silent: boolean;
  /** How a trouble shows in the check history. */
  trouble: 'down' | 'degraded' | null;
  /** False for a disabled supplier: nothing is checked. */
  checking: boolean;
};

// A component that is fine has been fine for some days.
const okSince = (state: HealthState, key: string): number =>
  state.anchor - pick(`${key}:since-d`, 2, 19) * DAY - pick(`${key}:since-h`, 0, 23) * HOUR;

// The core services that the database outage hurts: status, minutes ago it began, the failure text, the slow answer.
const OUTAGE_CORE: Record<
  string,
  { status: 'down' | 'degraded'; min: number; detail: string; stressed: number | null }
> = {
  postgres: { status: 'down', min: 14, detail: 'FATAL: sorry, too many clients already', stressed: null },
  workers: {
    status: 'degraded',
    min: 12,
    detail: 'Heartbeat slow: 3 of 4 workers cannot reach the database',
    stressed: 1450,
  },
  api: {
    status: 'degraded',
    min: 13,
    detail: 'Readiness probe answered 503 in 4 of the last 5 checks',
    stressed: 2300,
  },
};

// A core service or a gateway: fine, unless the database outage hurts it.
function specFact(state: HealthState, spec: ComponentSpec): Fact {
  const hurt = state.profile.dbDown ? OUTAGE_CORE[spec.key] : undefined;
  const signal: Signal = { name: `check:${spec.key}`, calm: spec.calm, day: 'mild', noise: 0.15 };
  if (hurt?.stressed) {
    signal.stressed = hurt.stressed;
    signal.since = state.anchor - hurt.min * MINUTE;
  }
  return {
    key: spec.key,
    name: spec.name,
    kind: spec.kind,
    supplierId: null,
    gatewayId: spec.id ?? null,
    status: hurt?.status ?? 'ok',
    since: hurt ? state.anchor - hurt.min * MINUTE : okSince(state, spec.key),
    detail: hurt?.detail ?? null,
    limits: { warn: spec.warn, crit: spec.crit },
    signal,
    silent: hurt?.stressed === null,
    trouble: hurt?.status ?? null,
    checking: true,
  };
}

// One supplier of the suppliers mock: fine, timing out in the slow-supplier story, or unchecked when disabled.
function supplierFact(state: HealthState, row: SupplierSource): Fact {
  const key = `supplier:${row.id}`;
  const slow = state.profile.slowSupplier && row.id === SLOW_SUPPLIER_ID;
  const onset = onsetOf(state.profile, state.anchor);
  const checking = row.status !== 'disabled';
  const signal: Signal = {
    name: `check:${key}`,
    calm: SUPPLIER_CALM_MS[row.id] ?? 600,
    day: 'mild',
    noise: 0.15,
    ...(slow ? { stressed: 6200, since: onset } : {}),
  };
  return {
    key,
    name: row.name,
    kind: 'supplier',
    supplierId: row.id,
    gatewayId: null,
    status: !checking ? 'unknown' : slow ? 'down' : 'ok',
    since: !checking ? null : slow ? onset : okSince(state, key),
    detail: slow ? 'timeout after 6000 ms' : !checking ? 'Supplier is disabled; its checks are off.' : null,
    limits: SUPPLIER_LIMITS,
    signal,
    silent: false,
    trouble: slow ? 'down' : null,
    checking,
  };
}

/** Every component: core services, then suppliers, then payment gateways. */
export function allFacts(state: HealthState, suppliers: SupplierSource[]): Fact[] {
  return [
    ...CORE.map((spec) => specFact(state, spec)),
    ...suppliers.map((row) => supplierFact(state, row)),
    ...GATEWAYS.map((spec) => specFact(state, spec)),
  ];
}

/** Response time of the last check, or null when the check got no answer or does not run. */
export function latencyNow(fact: Fact, now: number): number | null {
  if (!fact.checking || (fact.silent && fact.status === 'down')) return null;
  return nowOf(fact.signal, now);
}

/** The response time as a `Measure` with the limits of this component's kind. */
export const latencyMeasure = (fact: Fact, now: number): Measure =>
  measure({ unit: 'ms', ...fact.limits, direction: 'above' }, latencyNow(fact, now));

/** A fact as the health summary lists it. */
export function toComponent(fact: Fact, now: number): HealthComponent {
  return {
    key: fact.key,
    name: fact.name,
    kind: fact.kind,
    status: fact.status,
    since: fact.since === null ? null : iso(fact.since),
    latency: latencyMeasure(fact, now),
    uptime: componentUptime(fact, now),
    lastCheckedAt: fact.checking ? iso(Math.floor(now / MINUTE) * MINUTE) : null,
    detail: fact.detail,
    supplierId: fact.supplierId,
    gatewayId: fact.gatewayId,
  };
}

/**
 * The overall verdict. Without monitoring data it is `unknown`, never operational. A core service that is down is an
 * outage; any other broken component or a critical alert that is still open is a degradation.
 */
export function overallStatus(state: HealthState, facts: Fact[], open: AlertEvent[]): OverallStatus {
  if (state.profile.monitoringDown) return 'unknown';
  if (facts.some((fact) => fact.kind === 'core' && fact.status === 'down')) return 'outage';
  const broken = facts.some((fact) => fact.status === 'down' || fact.status === 'degraded');
  return broken || open.some((alert) => alert.severity === 'critical') ? 'degraded' : 'operational';
}
