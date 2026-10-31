// Time and noise helpers of the System health mock (route group `health`). Every series is a pure function of a name and
// a moment, so a poll repeats the old points and only the newest bucket is new. Dev and tests only.
import type { TimeRange } from '../types';

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** A moment as the API's ISO date-time text. */
export const iso = (ms: number): string => new Date(ms).toISOString();

/** FNV-1a 32-bit hash of a text. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A number in [0, 1) that depends only on the name and the moment (mulberry32 over the hash). */
export function unit(name: string, at = 0): number {
  let t = (hash(`${name}@${at}`) + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** A number in [-1, 1) with the same property. */
export const wobble = (name: string, at = 0): number => unit(name, at) * 2 - 1;

/** A whole number from `min` to `max` (both included) picked by name. */
export const pick = (name: string, min: number, max: number, at = 0): number =>
  min + Math.floor(unit(name, at) * (max - min + 1));

/** A short lowercase hex text derived from a name, for request ids and the like. */
export function hex(name: string, length: number): string {
  let out = '';
  for (let i = 0; out.length < length; i++) out += hash(`${name}#${i}`).toString(16).padStart(8, '0');
  return out.slice(0, length);
}

/** Share of the peak traffic at a moment: lowest around 02:00 UTC, highest around 14:00. */
export function dayCurve(at: number): number {
  const hour = (at % DAY) / HOUR;
  return 0.65 + 0.35 * Math.cos(((hour - 14) / 24) * 2 * Math.PI);
}

/** 0 before `since`, then a smooth climb to 1 over `over` ms. A null `since` means no trouble. */
export function ramp(at: number, since: number | null, over = 6 * MINUTE): number {
  if (since === null || at <= since) return 0;
  const x = Math.min(1, (at - since) / over);
  return x * x * (3 - 2 * x);
}

export const RANGES: readonly TimeRange[] = ['1h', '6h', '24h', '7d'];

/** Reads a `range` query value; anything else is not a range. */
export function isRange(value: unknown): value is TimeRange {
  return typeof value === 'string' && (RANGES as readonly string[]).includes(value);
}

const WINDOW: Record<TimeRange, number> = { '1h': HOUR, '6h': 6 * HOUR, '24h': DAY, '7d': 7 * DAY };
// Charts get finer buckets than the uptime bars, which would be unreadable with 168 cells.
const STEP = {
  metrics: { '1h': MINUTE, '6h': 5 * MINUTE, '24h': 15 * MINUTE, '7d': HOUR },
  checks: { '1h': MINUTE, '6h': 5 * MINUTE, '24h': 30 * MINUTE, '7d': 3 * HOUR },
} as const satisfies Record<string, Record<TimeRange, number>>;

/** Length of one bucket, in ms, for a kind of series and a range. */
export const stepOf = (kind: keyof typeof STEP, range: TimeRange): number => STEP[kind][range];

/** Start of every bucket of the range, oldest first; the last one holds `now` and is still filling. */
export function bucketStarts(range: TimeRange, step: number, now: number): number[] {
  const last = Math.floor(now / step) * step;
  const count = Math.round(WINDOW[range] / step);
  return Array.from({ length: count }, (_, i) => last - (count - 1 - i) * step);
}

/** Rounds to a number of decimals (0 for whole numbers). */
export function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
