// The words and numbers of the supplier stats: times, the runway sentence, the 90% target and the chart points. Ports msText and
// runwayText of 44-p-suppliers.js and the data side of the two line charts. Display only: the server decides what is healthy.
import type { LinePoint } from '@/components/charts';
import { fmtDate, fmtTime } from '@/lib/format';
import type { HourlyPoint } from '../types';

/** The success rate the demo draws as its dashed target line; a lower figure is shown in the "serious" colour. */
export const SUCCESS_TARGET = 90;

/** True when a success rate is known and under the target. */
export function belowTarget(rate: number | null): boolean {
  return rate !== null && rate < SUCCESS_TARGET;
}

/** "310 ms" or "2.4 s", with a non-breaking space (the demo's `msText`). */
export function msText(ms: number): string {
  const nbsp = '\u00a0';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}${nbsp}s` : `${Math.round(ms)}${nbsp}ms`;
}

/** "–" for an unknown time, else `msText`. */
export function msOrDash(ms: number | null): string {
  return ms === null ? '–' : msText(ms);
}

/** How long the balance lasts at the 7-day rate, in the demo's words. `null` means nothing was spent in the week. */
export function runwayText(days: number | null): string {
  if (days === null || !Number.isFinite(days)) return 'No volume in the last 7 days';
  const span =
    days < 1
      ? 'Less than a day of volume'
      : days > 90
        ? 'More than 90 days of volume'
        : `About ${days < 10 ? days.toFixed(1) : Math.round(days)} days of volume`;
  return `${span} at the 7-day rate`;
}

/** "5m", "45m", "2h 5m", "3d 4h": a duration given in minutes, as the services table shows the SLA (the demo's `ageText`). */
export function minutesText(minutes: number): string {
  const nbsp = '\u00a0';
  const m = Math.max(0, Math.round(minutes));
  if (m < 1) return '<1m';
  if (m < 60) return `${m}m`;
  const hours = Math.floor(m / 60);
  if (hours < 24) return `${hours}h${m % 60 ? `${nbsp}${m % 60}m` : ''}`;
  const days = Math.floor(hours / 24);
  return `${days}d${hours % 24 ? `${nbsp}${hours % 24}h` : ''}`;
}

/** Axis and tooltip text of the success chart: whole percents. */
export const percentLabel = (value: number): string => `${Math.round(value)}%`;

/**
 * Axis and tooltip text of the latency chart: whole milliseconds. The chart gives its axis labels 32px, so "600ms" would be
 * cut; the unit goes in the tooltip (`unit`) and next to the chart's title.
 */
export const latencyLabel = (value: number): string => String(Math.round(value));

/** The hourly history as chart points: the hour on the axis, the full date in the tooltip. */
export function chartPoints(
  history: readonly HourlyPoint[],
  pick: (point: HourlyPoint) => number,
): LinePoint[] {
  return history.map((point) => ({
    value: pick(point),
    label: fmtTime(point.at),
    detail: fmtDate(point.at),
  }));
}

/** The mean of the hourly success rates, for the "24 h average" line when the server does not send one. */
export function averageSuccess(history: readonly HourlyPoint[]): number | null {
  if (history.length === 0) return null;
  return history.reduce((total, point) => total + point.successRate, 0) / history.length;
}
