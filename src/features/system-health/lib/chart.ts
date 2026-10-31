// Helpers that put a `Measure` on a `LineChart`: axis and tooltip text per unit, the server's threshold as the dashed
// line, and fewer points for a small trend line. No demo screen (docs/system-health-design.md, "Charts").
import { compactNumber, type LineReference } from '@/components/charts';
import type { Measure, MeasureUnit, SeriesPoint, ThresholdDirection } from '../types';
import { formatBytes, formatValue, plainNumber } from './measure';

/** Axis labels have about 32px (LINE_MARGIN.left of the kit), so numbers go compact from 10,000 up. */
function chartNumber(value: number): string {
  return Math.abs(value) >= 10_000 ? compactNumber(value) : plainNumber(value, 2);
}

/** A duration on an axis or in a tooltip, one unit and no spaces: "45s", "3.2m", "1.5h". The table view is exact. */
function chartDuration(seconds: number): string {
  const abs = Math.abs(seconds);
  if (abs < 60) return `${plainNumber(seconds, 0)}s`;
  if (abs < 3600) return `${plainNumber(seconds / 60, 1)}m`;
  if (abs < 86400) return `${plainNumber(seconds / 3600, 1)}h`;
  return `${plainNumber(seconds / 86400, 1)}d`;
}

export interface ChartFormat {
  /** For `LineChart.formatValue`: axis labels and tooltip numbers. Short, with the unit left to `suffix`. */
  format: (value: number) => string;
  /** For `LineChart.unit`: appended to the tooltip value (" ms", " %", " /min"). */
  suffix: string;
}

/**
 * How a unit prints on a chart. The axis is too narrow for "250 ms", so ticks are bare numbers and the unit is written
 * in the tooltip and on the threshold label; `unitCaption` names it above the chart.
 */
export function chartFormat(unit: MeasureUnit): ChartFormat {
  switch (unit) {
    case 'ms':
      return { format: chartNumber, suffix: ' ms' };
    case 'percent':
      return { format: chartNumber, suffix: ' %' };
    case 'per_min':
      return { format: chartNumber, suffix: ' /min' };
    case 's':
      return { format: chartDuration, suffix: '' };
    case 'bytes':
      return { format: formatBytes, suffix: '' };
    default:
      return { format: chartNumber, suffix: '' };
  }
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
