// How long and how well the components have been up: the uptime of a component and of the whole platform, and the
// check history (one bucket per range step) behind the uptime bars. Everything is computed from the facts and the
// clock, so it moves with time. Dev and tests only.
import type { MockScenario } from '@/mocks/scenario';
import type { CheckBucket, SeriesPoint, TimeRange, UptimeWindows } from '../types';
import { DAY, MINUTE, bucketStarts, iso, round, stepOf, unit } from './clock';
import type { Fact } from './facts';
import { onsetOf } from './profile';
import { atBucket, sample } from './signal';
import type { HealthState } from './state';
import { SPEC, measure } from './thresholds';

/** Uptime of one component over the three windows. A trouble costs minutes: all of them if down, a third if degraded. */
export function componentUptime(fact: Fact, now: number): UptimeWindows {
  if (!fact.checking) {
    const none = measure(SPEC.uptime, null);
    return { h24: none, d7: { ...none }, d30: { ...none } };
  }
  const weight = fact.trouble === 'down' ? 1 : 0.3;
  const lost = fact.trouble === null || fact.since === null ? 0 : ((now - fact.since) / MINUTE) * weight;
  const share = (window: number): number => (Math.min(lost, window) / window) * 100;
  const calm7 = 99.97 + 0.03 * unit(`${fact.key}:d7`);
  const calm30 = 99.93 + 0.07 * unit(`${fact.key}:d30`);
  return {
    h24: measure(SPEC.uptime, 100 - share(1440)),
    d7: measure(SPEC.uptime, calm7 - share(10_080)),
    d30: measure(SPEC.uptime, calm30 - share(43_200)),
  };
}

/**
 * Uptime of the platform and its 30 daily points. The windows are worked out from the daily points (and the minutes lost
 * today), so the sparkline and the figure agree. An outage costs every minute, a degradation a seventh of it.
 */
export function platformUptime(state: HealthState, now: number): UptimeWindows & { daily: SeriesPoint[] } {
  const { profile } = state;
  const onset = onsetOf(profile, state.anchor);
  const weight = profile.tone === 'outage' ? 1 : profile.tone === 'degraded' ? 0.15 : 0;
  const lost = onset === null ? 0 : Math.min(((now - onset) / MINUTE) * weight, 1440);
  const today = Math.floor(now / DAY) * DAY;
  // Percentage points lost per day: dust, now and then a one-minute blip, and the scenario's own bad days.
  const deficits = Array.from({ length: 30 }, (_, i) => {
    const day = today - (29 - i) * DAY;
    let deficit = 0.004 * unit('uptime:dust', day);
    if (unit('uptime:blip', day) < 0.1) deficit += 0.05 + 0.1 * unit('uptime:size', day);
    if (i === 17 && profile.tone === 'outage') deficit += 15; // a three-hour outage twelve days ago
    if (i === 29) deficit += (lost / 1440) * 100;
    return deficit;
  });
  const mean = (values: number[]): number => values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    h24: measure(SPEC.uptime, 100 - (lost / 1440) * 100),
    d7: measure(SPEC.uptime, 100 - mean(deficits.slice(-7))),
    d30: measure(SPEC.uptime, 100 - mean(deficits)),
    daily: deficits.map((deficit, i) => ({
      at: iso(today - (29 - i) * DAY),
      value: round(100 - deficit, 2),
    })),
  };
}

// Minutes since a deploy the build is said to have run; the partial-failure story starts with a fresh deploy.
const DEPLOYED_MIN: Partial<Record<MockScenario, number>> = { 'partial-failure': 46, maintenance: 7200 };

/** When the running build was deployed (ms, on the minute). The workers restart then: two minutes without checks. */
export function deployedAt(state: HealthState): number {
  const at = state.anchor - (DEPLOYED_MIN[state.scenario] ?? 1800) * MINUTE;
  return Math.floor(at / MINUTE) * MINUTE;
}

/**
 * The check history of a component over a range. The worker checks once a minute, so a bucket holds one check per
 * minute; its status is the worst check in it. Nothing is checked while the worker restarts (`unknown`), and an
 * occasional slow check shows as `degraded`.
 */
export function checkBuckets(fact: Fact, range: TimeRange, now: number, deployed: number): CheckBucket[] {
  const step = stepOf('checks', range);
  return bucketStarts(range, step, now).map((start): CheckBucket => {
    const none: CheckBucket = {
      start: iso(start),
      status: 'unknown',
      checks: 0,
      failures: 0,
      latencyMs: null,
    };
    if (!fact.checking) return none;
    const end = start + step;
    const covered = Math.min(end, now);
    const restart = Math.max(0, Math.min(end, deployed + 2 * MINUTE) - Math.max(start, deployed)) / MINUTE;
    const checks = Math.max(1, Math.floor((covered - start) / MINUTE)) - Math.round(restart);
    if (checks <= 0) return none;

    const sick = fact.trouble !== null && fact.since !== null;
    const share = sick
      ? Math.min(1, Math.max(0, (covered - (fact.since ?? 0)) / Math.max(MINUTE, covered - start)))
      : 0;
    const failures = fact.trouble === 'down' ? Math.round(checks * share) : 0;
    const blip = fact.trouble === null && unit(`${fact.key}:slow`, start) < 0.012;
    const slow = blip || (fact.trouble === 'degraded' && share > 0);
    const unanswered = failures === checks && fact.silent;
    return {
      start: iso(start),
      status: failures > 0 ? 'down' : slow ? 'degraded' : 'ok',
      checks,
      failures,
      latencyMs: unanswered
        ? null
        : round(sample(fact.signal, atBucket(start, step, now), step) * (blip ? 3 : 1)),
    };
  });
}
