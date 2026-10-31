// Helpers that put a `Measure` on a `LineChart`: the axis top and labels per unit, the server's threshold as the dashed
// line, and fewer points for a small trend line. No demo screen (docs/system-health-design.md, "Charts").
import { compactNumber, type LineReference } from '@/components/charts';
import type { Measure, MeasureUnit, SeriesPoint, ThresholdDirection } from '../types';
import { formatBytes, formatValue, plainNumber } from './measure';

/** Steps an axis may take, times a power of ten. 2.5 keeps a 6.2 s peak on a 7.5 s axis instead of a 15 s one. */
const NICE_FRACTIONS = [1, 2, 2.5, 5, 10] as const;

/** A duration on an axis or in a tooltip, one unit and no spaces: "45s", "3.2m", "1.5h". The table view is exact. */
function chartDuration(seconds: number): string {
  const abs = Math.abs(seconds);
  if (abs < 60) return `${plainNumber(seconds, 0)}s`;
  if (abs < 3600) return `${plainNumber(seconds / 60, 1)}m`;
  if (abs < 86400) return `${plainNumber(seconds / 3600, 1)}h`;
  return `${plainNumber(seconds / 86400, 1)}d`;
}

const UNIT_CAPTION: Record<MeasureUnit, string> = {
  ms: 'Milliseconds',
  s: 'Duration',
  percent: 'Percent',
  per_min: 'Per minute',
  count: 'Count',
  bytes: 'Size',
};

/** A word for the unit of the y axis, written above the chart so the bare tick numbers are never unitless. */
export function unitCaption(unit: MeasureUnit): string {
  return Object.hasOwn(UNIT_CAPTION, unit) ? UNIT_CAPTION[unit] : '';
}

/**
 * The server's threshold as the chart's dashed line: the crit value, or the warn one when there is no crit. `bad` follows
 * the measure's `direction` (latency and error rates are bad above, uptime and hit rate below). Without a direction the
 * line is bad above, the common case. Null when the measure has no threshold: then no line is drawn.
 */
export function thresholdReference(
  measure: Pick<Measure, 'unit' | 'warn' | 'crit' | 'direction'>,
): LineReference | undefined {
  const { unit, warn, crit, direction } = measure;
  const word = crit == null ? 'warn' : 'crit';
  const value = crit ?? warn;
  if (value == null) return undefined;
  return { value, label: `${word} ${formatValue(value, unit)}`, bad: direction ?? 'above' };
}

/**
 * Fewer points for a small trend line: the series is cut into `target` equal runs and each run keeps its worst point
 * (the highest, or the lowest when the bad side is `below`), so a short spike still shows. A run without data stays a
 * gap. A series that is already short enough comes back as it is. Display only: no value is judged here.
 */
export function downsample(
  points: readonly SeriesPoint[],
  target: number,
  direction: ThresholdDirection = 'above',
): SeriesPoint[] {
  if (target < 1 || points.length <= target) return [...points];
  const runs: SeriesPoint[] = [];
  for (let i = 0; i < target; i += 1) {
    const run = points.slice(
      Math.floor((i * points.length) / target),
      Math.floor(((i + 1) * points.length) / target),
    );
    const known = run.map((point) => point.value).filter((value): value is number => value !== null);
    const worst = direction === 'below' ? Math.min(...known) : Math.max(...known);
    runs.push({ at: run[0]!.at, value: known.length > 0 ? worst : null });
  }
  return runs;
}

/**
 * A round top for an axis of `ticks` equal steps that starts at `bottom` and reaches at least `highest`. The step is 1,
 * 2, 2.5 or 5 times a power of ten, the smallest that fits.
 */
export function niceTop(highest: number, ticks: number, bottom = 0): number {
  const span = highest - bottom;
  if (!Number.isFinite(span) || span <= 0 || ticks < 1) return bottom + Math.max(1, ticks);
  const raw = span / ticks;
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  const fraction = NICE_FRACTIONS.find((candidate) => candidate * power >= raw * (1 - 1e-9)) ?? 10;
  // toPrecision drops float noise such as 0.6000000000000001.
  return Number((bottom + fraction * power * ticks).toPrecision(12));
}

/** How the y axis of a chart reads: the label of every tick in one style, and the caption that names the unit. */
export interface AxisFormat {
  format: (value: number) => string;
  caption: string;
}

/**
 * One style for every tick, chosen from the top of the axis. Milliseconds read as seconds once the axis passes a
 * second (caption "Seconds", ticks "2.5", "5"), so they match the "crit 5 s" label; other numbers turn compact only when
 * the top reaches 10,000 ("5K", "10K", "15K"), never half and half. Durations and sizes keep their own short forms.
 */
export function axisFormat(unit: MeasureUnit, top: number): AxisFormat {
  const decimals = (scaledTop: number) => (scaledTop < 10 ? 2 : 0);
  switch (unit) {
    case 'ms':
      return top >= 1000
        ? { format: (value) => plainNumber(value / 1000, decimals(top / 1000)), caption: 'Seconds' }
        : { format: (value) => plainNumber(value, decimals(top)), caption: 'Milliseconds' };
    case 's':
      return { format: chartDuration, caption: unitCaption(unit) };
    case 'bytes':
      return { format: formatBytes, caption: unitCaption(unit) };
    default:
      return top >= 10_000
        ? { format: compactNumber, caption: unitCaption(unit) }
        : { format: (value) => plainNumber(value, decimals(top)), caption: unitCaption(unit) };
  }
}

/**
 * Whether the server's threshold goes on the chart's axis. A line bad below (uptime) always does; a line bad above does
 * when the series comes within 2.5 times of it. Otherwise the axis would stretch to a far-away threshold and flatten a
 * healthy line along the bottom; the card then names the threshold in words instead.
 */
export function thresholdOnAxis(reference: LineReference, highest: number): boolean {
  return reference.bad === 'below' || highest >= reference.value * 0.4;
}
