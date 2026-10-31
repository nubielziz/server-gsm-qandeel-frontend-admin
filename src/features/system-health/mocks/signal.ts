// A "signal" is one number that moves over time: a calm level that follows the day, a little seeded noise, and an
// optional climb to a stressed level once a trouble begins. Charts, sparklines and the "now" figures are all samples
// of the same signal, so the newest point of a chart always agrees with the figure above it.
import type { SeriesPoint } from '../types';
import { MINUTE, dayCurve, iso, ramp, round, wobble } from './clock';

export type Signal = {
  /** Seed name: the same name always gives the same numbers. */
  name: string;
  /** Calm level at the daily peak (see `day`). */
  calm: number;
  /** `traffic` follows the daily curve fully (requests), `mild` slightly (latency), `flat` not at all. */
  day?: 'traffic' | 'mild' | 'flat';
  /** Relative noise of a one-minute sample (0.06 means plus or minus 6 %). Longer buckets are smoother. */
  noise?: number;
  /** Level once the trouble has set in (absolute), and/or a factor the level is multiplied by; `since` is when it began. */
  stressed?: number;
  factor?: number;
  since?: number | null;
  /** The value never goes below this (default 0). */
  min?: number;
};

function dayFactor(signal: Signal, at: number): number {
  if (signal.day === 'flat') return 1;
  return signal.day === 'traffic' ? dayCurve(at) : 0.9 + 0.2 * dayCurve(at);
}

/** The signal in the bucket that starts at `at` and lasts `step` ms. */
export function sample(signal: Signal, at: number, step: number): number {
  const calm = signal.calm * dayFactor(signal, at);
  const climb = ramp(at, signal.since ?? null);
  const absolute = signal.stressed === undefined ? calm : calm + (signal.stressed - calm) * climb;
  const level = absolute * (1 + ((signal.factor ?? 1) - 1) * climb);
  const smooth = step <= MINUTE ? 1 : step <= 5 * MINUTE ? 0.7 : step <= 15 * MINUTE ? 0.5 : 0.3;
  return Math.max(signal.min ?? 0, level * (1 + wobble(signal.name, at) * (signal.noise ?? 0.06) * smooth));
}

/**
 * The moment a bucket is sampled at: its middle, or the current minute for the bucket that is still filling. So the
 * newest point of a chart is the "now" figure, and an older point never changes between polls.
 */
export const atBucket = (start: number, step: number, now: number): number =>
  Math.min(start + step / 2, Math.floor(now / MINUTE) * MINUTE);

/** The "now" figure: the signal in the current minute. It moves a little at every minute, never inside one. */
export function nowOf(signal: Signal, now: number): number {
  return sample(signal, Math.floor(now / MINUTE) * MINUTE, MINUTE);
}

/**
 * One point per bucket start. A bucket for which `gap` answers true has no data (null), as when the metrics
 * backend missed a scrape.
 */
export function series(
  signal: Signal,
  starts: number[],
  step: number,
  now: number,
  options: { decimals?: number; gap?: (at: number) => boolean } = {},
): SeriesPoint[] {
  const { decimals = 0, gap } = options;
  return starts.map((at) => ({
    at: iso(at),
    value: gap?.(at) ? null : round(sample(signal, atBucket(at, step, now), step), decimals),
  }));
}
