// Prints a `Measure` (value + unit) and its thresholds for the System health page: "412 ms", "0.42 %", "1,240 /min",
// "3m 12s", "1.2 GB". No demo screen; the units come from the contract in ../types/common.ts.
import type { Measure, MeasureUnit, MetricState } from '../types';
import { compareStatus, metricStateMeta, type StatusMeta } from './status';

/** What a missing value prints. A missing number is neutral, never zero and never healthy. */
export const NO_DATA = 'No data';

const formatters = new Map<number, Intl.NumberFormat>();

/** A number with thousands separators and at most `maxDecimals` decimals, trailing zeros dropped (1240 -> "1,240"). */
export function plainNumber(value: number, maxDecimals = 0): string {
  let formatter = formatters.get(maxDecimals);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: maxDecimals });
    formatters.set(maxDecimals, formatter);
  }
  return formatter.format(value);
}

/** Milliseconds below one second ("412 ms"), seconds from there ("6.2 s"), so a slow supplier stays readable. */
function formatMs(ms: number): string {
  if (Math.abs(ms) < 1000) return `${plainNumber(ms, Math.abs(ms) < 10 ? 1 : 0)} ms`;
  const seconds = ms / 1000;
  return `${plainNumber(seconds, Math.abs(seconds) < 10 ? 1 : 0)} s`;
}

/** Seconds as a duration in its two largest units: "45s", "3m 12s", "2h 5m", "3d 4h". Under one second: "<1s". */
export function formatDuration(seconds: number): string {
  if (seconds > 0 && seconds < 1) return '<1s';
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total}s`;
  if (total < 3600) {
    const rest = total % 60;
    return rest ? `${Math.floor(total / 60)}m ${rest}s` : `${Math.floor(total / 60)}m`;
  }
  if (total < 86400) {
    const minutes = Math.floor((total % 3600) / 60);
    return minutes ? `${Math.floor(total / 3600)}h ${minutes}m` : `${Math.floor(total / 3600)}h`;
  }
  const hours = Math.floor((total % 86400) / 3600);
  return hours ? `${Math.floor(total / 86400)}d ${hours}h` : `${Math.floor(total / 86400)}d`;
}

/** Percent with up to two decimals. It never rounds 99.996 up to "100" or a tiny value down to "0": both would lie. */
function formatPercent(value: number): string {
  const text = plainNumber(value, 2);
  if (value < 100 && text === '100') return '99.99';
  if (value > 0 && text === '0') return '<0.01';
  return text;
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;

/** Bytes in steps of 1024: "512 MB", "1.2 GB", "12 GB". */
export function formatBytes(bytes: number): string {
  let value = Math.abs(bytes);
  let step = 0;
  // Compare the rounded value, so 1023.6 KB moves up to "1 MB" instead of printing "1,024 KB".
  while (step < BYTE_UNITS.length - 1 && Math.round(value) >= 1024) {
    value /= 1024;
    step += 1;
  }
  const decimals = step > 0 && value < 10 ? 1 : 0;
  return `${bytes < 0 ? '-' : ''}${plainNumber(value, decimals)} ${BYTE_UNITS[step]}`;
}

/**
 * Prints one number in its unit. `null` (or a missing or non-finite number) prints "No data". The unit is always
 * visible, except for plain counts. An unknown unit (the contract is assumed) prints the bare number.
 */
export function formatValue(value: number | null | undefined, unit: MeasureUnit): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return NO_DATA;
  switch (unit) {
    case 'ms':
      return formatMs(value);
    case 's':
      return formatDuration(value);
    case 'percent':
      return `${formatPercent(value)} %`;
    case 'per_min':
      return `${plainNumber(value, Math.abs(value) < 10 ? 1 : 0)} /min`;
    case 'count':
      return plainNumber(value, Number.isInteger(value) ? 0 : 2);
    case 'bytes':
      return formatBytes(value);
    default:
      return plainNumber(value, 2);
  }
}

/** The value of a measure in its unit, as the server sent it. Prints "No data" when the value is null. */
export function formatMeasure(measure: Pick<Measure, 'value' | 'unit'>): string {
  return formatValue(measure.value, measure.unit);
}

export interface ThresholdTextOptions {
  /** Print the warn and the crit threshold: "warn 800 ms · crit 1.5 s". */
  both?: boolean;
  /** Replaces the word "warn", for example "target" for uptime. */
  warnLabel?: string;
}

/**
 * Millisecond limits in one scale for the pair: seconds when the value itself prints in seconds and every limit is at
 * least 100 ms ("8.7 s" over "warn 0.8 s · crit 1.5 s"), milliseconds otherwise ("30 s" over "warn 50 ms · crit
 * 500 ms", never "0.05 s"). Both limits always share the unit.
 */
function msLimitsInSeconds(value: number, limits: readonly number[]): boolean {
  return Math.abs(value) >= 1000 && limits.every((limit) => Math.abs(limit) >= 100);
}

function formatMsIn(ms: number, seconds: boolean): string {
  return seconds ? `${plainNumber(ms / 1000, 2)} s` : `${plainNumber(ms, Math.abs(ms) < 10 ? 1 : 0)} ms`;
}

/**
 * The thresholds the server applied, as small text: "warn 800 ms" (the first line the value would cross), or the crit one
 * when there is no warn. Returns null when the measure has no threshold. It only prints; it never compares the value.
 * With a `value` in milliseconds, both thresholds print in one scale that suits the value (see msLimitsInSeconds).
 */
export function thresholdText(
  measure: Pick<Measure, 'unit' | 'warn' | 'crit'> & { value?: number | null },
  { both = false, warnLabel = 'warn' }: ThresholdTextOptions = {},
): string | null {
  const { unit, warn, crit, value } = measure;
  const limits = [warn, crit].filter((limit): limit is number => limit != null && Number.isFinite(limit));
  const scaled = unit === 'ms' && value != null && Number.isFinite(value);
  const seconds = scaled && msLimitsInSeconds(value, limits);
  const print = (limit: number) => (scaled ? formatMsIn(limit, seconds) : formatValue(limit, unit));
  const warnText = warn == null ? null : `${warnLabel} ${print(warn)}`;
  const critText = crit == null ? null : `crit ${print(crit)}`;
  if (both) return [warnText, critText].filter(Boolean).join(' · ') || null;
  return warnText ?? critText;
}

/** Tone, icon and word of a measure's state (ok, warn, crit, unknown). */
export function stateMeta(state: MetricState): StatusMeta {
  return metricStateMeta(state);
}

/** Comparator for Array.sort: the worse state first (crit, warn, unknown, ok). */
export function compareStates(a: MetricState, b: MetricState): number {
  return compareStatus(a, b);
}
