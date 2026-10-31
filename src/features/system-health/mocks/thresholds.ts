// The thresholds the mock server applies and the `Measure` builder that works out each state (the mock plays the
// server, so it decides; the console only shows). KPI rows follow docs/system-health-design.md; the rest are proposals.
import type { Measure, MeasureUnit, MetricState, ThresholdDirection } from '../types';
import { round } from './clock';

/** The limits of one kind of number. `direction` says which side is bad; no limits means "informational". */
export type Spec = { unit: MeasureUnit; warn?: number; crit?: number; direction?: ThresholdDirection };

export const SPEC = {
  // KPI row (design brief)
  uptime: { unit: 'percent', warn: 99.9, crit: 99.5, direction: 'below' },
  apiP95: { unit: 'ms', warn: 800, crit: 1500, direction: 'above' },
  rate5xx: { unit: 'percent', warn: 0.5, crit: 2, direction: 'above' },
  queueAge: { unit: 's', warn: 120, crit: 600, direction: 'above' },
  pastSla: { unit: 'count', warn: 5, crit: 20, direction: 'above' },
  alertsOpen: { unit: 'count', warn: 1 },
  // API
  apiP50: { unit: 'ms', warn: 400, crit: 800, direction: 'above' },
  apiP99: { unit: 'ms', warn: 2000, crit: 4000, direction: 'above' },
  rate4xx: { unit: 'percent', warn: 8, crit: 20, direction: 'above' },
  count429: { unit: 'count', warn: 20, crit: 100, direction: 'above' },
  traffic: { unit: 'per_min' },
  // Orders and suppliers
  dispatch: { unit: 's', warn: 120, crit: 300, direction: 'above' },
  success: { unit: 'percent', warn: 97, crit: 90, direction: 'below' },
  failure: { unit: 'percent', warn: 3, crit: 10, direction: 'above' },
  supplierLatency: { unit: 'ms', warn: 2000, crit: 5000, direction: 'above' },
  supplierErrors: { unit: 'percent', warn: 5, crit: 20, direction: 'above' },
  // Queues and webhooks
  queueRate: { unit: 'per_min' },
  webhookSuccess: { unit: 'percent', warn: 97, crit: 90, direction: 'below' },
  webhookAge: { unit: 's', warn: 300, crit: 1800, direction: 'above' },
  // Data stores
  connections: { unit: 'percent', warn: 70, crit: 90, direction: 'above' },
  poolWait: { unit: 'ms', warn: 50, crit: 500, direction: 'above' },
  lockWait: { unit: 's', warn: 5, crit: 30, direction: 'above' },
  replicaLag: { unit: 's', warn: 5, crit: 30, direction: 'above' },
  memory: { unit: 'percent', warn: 75, crit: 90, direction: 'above' },
  evictions: { unit: 'per_min', warn: 10, crit: 100, direction: 'above' },
  hitRate: { unit: 'percent', warn: 90, crit: 70, direction: 'below' },
  clients: { unit: 'count', warn: 400, crit: 900, direction: 'above' },
  redisLatency: { unit: 'ms', warn: 5, crit: 25, direction: 'above' },
} as const satisfies Record<string, Spec>;

/** The server's verdict on one value. No value means no data, which is never "ok". */
export function stateOf(spec: Spec, value: number | null): MetricState {
  if (value === null || !Number.isFinite(value)) return 'unknown';
  const { warn, crit, direction = 'above' } = spec;
  const bad = (limit: number | undefined): boolean =>
    limit !== undefined && (direction === 'above' ? value > limit : value < limit);
  return bad(crit) ? 'crit' : bad(warn) ? 'warn' : 'ok';
}

// Decimals a unit is sent with; seconds keep one decimal while small (a replica lag of 0.4 s).
function roundFor(unit: MeasureUnit, value: number): number {
  if (unit === 'percent') return round(value, 2);
  if (unit === 'per_min') return round(value, 1);
  if (unit === 's') return round(value, value < 10 ? 1 : 0);
  // A Redis latency of 0.4 ms must not arrive as 0: "0 ms" would read as a real zero.
  if (unit === 'ms') return round(value, value < 10 ? 1 : 0);
  return round(value);
}

/** A `Measure` for a value, with the limits of `spec` and the state they give (worked out on the rounded value). */
export function measure(spec: Spec, value: number | null): Measure {
  const rounded = value === null || !Number.isFinite(value) ? null : roundFor(spec.unit, value);
  const out: Measure = { value: rounded, unit: spec.unit, state: stateOf(spec, rounded) };
  if (spec.warn !== undefined) out.warn = spec.warn;
  if (spec.crit !== undefined) out.crit = spec.crit;
  if (spec.direction) out.direction = spec.direction;
  return out;
}

/** The worst of some states (crit, then warn, then unknown, then ok): a queue or a job as a whole. */
export function worst(states: MetricState[]): MetricState {
  for (const state of ['crit', 'warn', 'unknown'] as const) if (states.includes(state)) return state;
  return 'ok';
}
