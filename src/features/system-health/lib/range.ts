// The time range of the charts and ranked lists (`?range=`): its options, labels and the x-axis text of a chart.
// No demo screen (docs/system-health-design.md, "Tabs"). The KPI row and "now" values ignore the range.
import type { LinePoint } from '@/components/charts';
import type { SegmentItem } from '@/components/ui';
import type { IsoDateTime } from '@/lib/api';
import { fmtDay, fmtTime } from '@/lib/format';
import type { SeriesPoint, TimeRange } from '../types';

/** Every range, shortest first. */
export const RANGES: readonly TimeRange[] = ['1h', '6h', '24h', '7d'];

/** The items of the range `SegmentedControl` in the header: 1h, 6h, 24h, 7d. */
export const RANGE_ITEMS: readonly SegmentItem<TimeRange>[] = RANGES.map((range) => ({
  value: range,
  label: range,
}));

/** The range in words, for chart names and card subtitles. */
export const RANGE_LABEL: Record<TimeRange, string> = {
  '1h': 'Last hour',
  '6h': 'Last 6 hours',
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
};

/** Narrows an address value (`?range=`) to a range. */
export function isTimeRange(value: unknown): value is TimeRange {
  return typeof value === 'string' && (RANGES as readonly string[]).includes(value);
}

const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short' });

/**
 * The short x-axis label of a bucket: the time of day ("14:05"), and for the 7 day range the weekday too ("Mon 14:00"),
 * because the same hour comes round every day. Empty for a time that cannot be read.
 */
export function chartLabel(at: IsoDateTime, range: TimeRange): string {
  const ms = Date.parse(at);
  if (Number.isNaN(ms)) return '';
  return range === '7d' ? `${weekday.format(ms)} ${fmtTime(ms)}` : fmtTime(ms);
}

/** The long label of a bucket for the tooltip and the table view: "Thu, 05 Mar, 14:05". */
export function chartDetail(at: IsoDateTime): string {
  const day = fmtDay(at);
  const time = fmtTime(at);
  return day && time ? `${day}, ${time}` : '';
}

/**
 * The points of a series as `LineChart` points. A null value stays null, so the chart draws a gap ("No data" in the
 * tooltip) and never a zero. The order (oldest first) is kept.
 */
export function toLinePoints(points: readonly SeriesPoint[], range: TimeRange): LinePoint[] {
  return points.map((point) => ({
    value: point.value,
    label: chartLabel(point.at, range),
    detail: chartDetail(point.at),
  }));
}
