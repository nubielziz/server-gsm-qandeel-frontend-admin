// The answer of `GET /admin/system/metrics`: per-surface traffic made of seeded signals (so the chart's newest point
// agrees with the "now" figure), the totals weighted by traffic, and the slowest endpoints. Dev and tests only.
import type { ApiMetrics, SeriesPoint, SlowEndpoint, SurfaceMetrics, TimeRange } from '../types';
import { MINUTE, SECOND, bucketStarts, dayCurve, iso, round, stepOf } from './clock';
import { deployedAt } from './history';
import { onsetOf, type Profile } from './profile';
import { atBucket, nowOf, sample, type Signal } from './signal';
import { ENDPOINTS, SURFACES, SURFACE_STRESS, type Stress, type SurfaceSpec } from './specsApi';
import type { HealthState } from './state';
import { SPEC, measure } from './thresholds';

const METRICS = ['requestsPerMin', 'p50', 'p95', 'p99', 'rate4xx', 'rate5xx'] as const;
type Metric = (typeof METRICS)[number];
type Values = Record<Metric, number>;

function stressFor(profile: Profile, surface: string): Stress | undefined {
  const table: Record<string, Stress> | undefined = profile.dbDown
    ? SURFACE_STRESS.outage
    : profile.slowSupplier
      ? SURFACE_STRESS.degraded
      : undefined;
  return table?.[surface];
}

// One signal per metric of a surface; a trouble multiplies the latencies and traffic and lifts the 5xx rate.
function signalsOf(state: HealthState, spec: SurfaceSpec): Record<Metric | 'count429', Signal> {
  const since = onsetOf(state.profile, state.anchor);
  const stress = stressFor(state.profile, spec.key);
  // The p99 follows the p95: a tail that is six times slower is six times slower at the 99th too.
  const slowdown = (factor: number | undefined) => (factor ? { factor, since } : {});
  const name = (metric: string): string => `metrics:${spec.key}:${metric}`;
  return {
    requestsPerMin: {
      name: name('rpm'),
      calm: spec.rpm,
      day: 'traffic',
      noise: 0.08,
      factor: stress?.traffic,
      since,
    },
    p50: { name: name('p50'), calm: spec.p50, day: 'mild', noise: 0.08, ...slowdown(stress?.p50) },
    p95: { name: name('p95'), calm: spec.p95, day: 'mild', noise: 0.08, ...slowdown(stress?.p95) },
    p99: { name: name('p99'), calm: spec.p99, day: 'mild', noise: 0.1, ...slowdown(stress?.p95) },
    rate4xx: { name: name('4xx'), calm: spec.rate4xx, day: 'flat', noise: 0.12 },
    rate5xx: {
      name: name('5xx'),
      calm: spec.rate5xx,
      day: 'flat',
      noise: 0.15,
      stressed: stress?.rate5xx,
      since,
    },
    count429: { name: name('429'), calm: spec.count429, day: 'traffic', noise: 0.5 },
  };
}

type Part = { raw: Record<Metric, (number | null)[]>; now: Values & { count429: number } };

// A surface's numbers per bucket and right now. Prometheus misses scrapes while the API restarts after a deploy and, once,
// about nine hours before the state was seeded, for three quarters of an hour on the incoming-webhook surface: those
// buckets have no value.
function partOf(state: HealthState, spec: SurfaceSpec, starts: number[], step: number, now: number): Part {
  const signals = signalsOf(state, spec);
  const deployed = deployedAt(state);
  const missed = (at: number): boolean =>
    (step <= 5 * MINUTE && at <= deployed && deployed < at + step) ||
    (spec.key === 'hooks' && at >= state.anchor - 570 * MINUTE && at < state.anchor - 525 * MINUTE);
  const raw = Object.fromEntries(
    METRICS.map((metric) => [
      metric,
      starts.map((at) => (missed(at) ? null : sample(signals[metric], atBucket(at, step, now), step))),
    ]),
  ) as Part['raw'];
  const current = Object.fromEntries(
    METRICS.map((metric) => [metric, nowOf(signals[metric], now)]),
  ) as Values;
  return { raw, now: { ...current, count429: nowOf(signals.count429, now) } };
}

// All surfaces together: traffic adds up, everything else is the average weighted by each surface's traffic.
function totalOf(parts: Part[]): Part {
  const weighted = (metric: Metric, i: number | null): number | null => {
    let sum = 0;
    let weight = 0;
    for (const part of parts) {
      const value = i === null ? part.now[metric] : part.raw[metric][i];
      const w = i === null ? part.now.requestsPerMin : part.raw.requestsPerMin[i];
      if (value === null || w === null) continue;
      sum += value * w;
      weight += w;
    }
    return weight === 0 ? null : sum / weight;
  };
  const added = (i: number | null): number | null => {
    const values = parts.map((part) => (i === null ? part.now.requestsPerMin : part.raw.requestsPerMin[i]));
    const known = values.filter((value): value is number => value !== null);
    return known.length === 0 ? null : known.reduce((sum, value) => sum + value, 0);
  };
  const count = parts[0].raw.p95.length;
  const raw = Object.fromEntries(
    METRICS.map((metric) => [
      metric,
      Array.from({ length: count }, (_, i) => (metric === 'requestsPerMin' ? added(i) : weighted(metric, i))),
    ]),
  ) as Part['raw'];
  const current = Object.fromEntries(
    METRICS.map((metric) => [
      metric,
      (metric === 'requestsPerMin' ? added(null) : weighted(metric, null)) ?? 0,
    ]),
  ) as Values;
  return { raw, now: { ...current, count429: parts.reduce((sum, part) => sum + part.now.count429, 0) } };
}

const DECIMALS: Record<Metric, number> = {
  requestsPerMin: 1,
  p50: 0,
  p95: 0,
  p99: 0,
  rate4xx: 2,
  rate5xx: 2,
};

function toSurface(key: string, label: string, part: Part, starts: number[]): SurfaceMetrics {
  const points = (metric: Metric): SeriesPoint[] =>
    starts.map((at, i) => {
      const value = part.raw[metric][i];
      return { at: iso(at), value: value === null ? null : round(value, DECIMALS[metric]) };
    });
  return {
    surface: key,
    label,
    requestsPerMin: measure(SPEC.traffic, part.now.requestsPerMin),
    p50: measure(SPEC.apiP50, part.now.p50),
    p95: measure(SPEC.apiP95, part.now.p95),
    p99: measure(SPEC.apiP99, part.now.p99),
    rate4xx: measure(SPEC.rate4xx, part.now.rate4xx),
    rate5xx: measure(SPEC.rate5xx, part.now.rate5xx),
    count429: measure(SPEC.count429, part.now.count429),
    series: {
      requestsPerMin: points('requestsPerMin'),
      p50: points('p50'),
      p95: points('p95'),
      p99: points('p99'),
      rate4xx: points('rate4xx'),
      rate5xx: points('rate5xx'),
    },
  };
}

// The ten slowest endpoints of the surfaces asked for, by p95 right now.
function slowest(
  state: HealthState,
  surface: string | undefined,
  range: TimeRange,
  now: number,
): SlowEndpoint[] {
  const since = onsetOf(state.profile, state.anchor);
  return ENDPOINTS.filter((endpoint) => !surface || endpoint.surface === surface)
    .map((endpoint) => {
      const stress = stressFor(state.profile, endpoint.surface);
      const signal: Signal = {
        name: `slowest:${range}:${endpoint.method}:${endpoint.path}`,
        calm: endpoint.p95,
        day: 'mild',
        noise: 0.06,
        factor: stress?.p95,
        since,
      };
      return {
        method: endpoint.method,
        path: endpoint.path,
        surface: endpoint.surface,
        p95: measure(SPEC.apiP95, nowOf(signal, now)),
        requestsPerMin: round(endpoint.rpm * (stress?.traffic ?? 1) * (0.6 + 0.4 * dayCurve(now)), 1),
      };
    })
    .sort((a, b) => (b.p95.value ?? 0) - (a.p95.value ?? 0))
    .slice(0, 10);
}

/** `GET /admin/system/metrics`. With a surface, everything in the answer is about that surface alone. */
export function buildMetrics(
  state: HealthState,
  range: TimeRange,
  surface: string | undefined,
  now: number,
): ApiMetrics {
  const step = stepOf('metrics', range);
  const starts = bucketStarts(range, step, now);
  const specs = SURFACES.filter((spec) => !surface || spec.key === surface);
  const parts = specs.map((spec) => partOf(state, spec, starts, step, now));
  const only = specs.length === 1 ? specs[0] : undefined;
  return {
    range,
    bucketSeconds: step / SECOND,
    total: toSurface(only?.key ?? 'total', only?.label ?? 'All surfaces', totalOf(parts), starts),
    surfaces: specs.map((spec, i) => toSurface(spec.key, spec.label, parts[i], starts)),
    slowest: slowest(state, surface, range, now),
  };
}
