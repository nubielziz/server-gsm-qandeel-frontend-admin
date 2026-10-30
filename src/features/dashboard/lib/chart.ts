// The rows the two charts draw, from the dashboard payload. Ports chartSpan() and the row building of chartPanel() and
// channelPanel() in 40-p-dashboard.js, minus the notes about synthetic history (those described the demo's fake data).
import { sum, type StackedRow } from '@/components/charts';
import { toAmount } from '@/lib/format';
import type { ChannelRevenue, OrdersByType, TypeCounts } from '../types';
import type { ChartRange } from './view';

/** Shown when 12 months is asked for and the server has no yearly history for the channel. */
export const NO_YEARLY_NOTE = 'The storefront has no yearly history yet, so this shows 30 days.';

// A chart bucket is a calendar day or month, so it is formatted in UTC: a local zone could print the neighbouring day.
const DAY_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const MONTH_FORMAT = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' });

/** "2026-10-30" becomes "30 Oct". Anything that is not a date is shown as it came. */
export function dayLabel(date: string): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  return parts ? DAY_FORMAT.format(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]))) : date;
}

/** "2026-10" becomes "Oct". */
export function monthLabel(month: string): string {
  const parts = /^(\d{4})-(\d{2})/.exec(month);
  return parts ? MONTH_FORMAT.format(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, 1)) : month;
}

// The series keys are the kit's (`SERIES` in components/charts): IMEI, Server, Remote, File.
function typeRow(label: string, counts: TypeCounts): StackedRow {
  return {
    label,
    values: { IMEI: counts.imei, Server: counts.server, Remote: counts.remote, File: counts.file },
  };
}

export type ChartSpan = {
  /** The range actually drawn: it differs from the one asked for when the 12-month history is missing. */
  range: ChartRange;
  rows: StackedRow[];
  /** A sentence for the panel's sub line, or empty. */
  note: string;
};

/** The "Orders by type" rows for the chosen range. 12M without monthly history falls back to 30 days and says so. */
export function chartSpan(data: OrdersByType, range: ChartRange): ChartSpan {
  const daily = (days: typeof data.daily) => days.map((day) => typeRow(dayLabel(day.date), day));
  if (range === '12M') {
    if (data.monthly) {
      return { range, rows: data.monthly.map((m) => typeRow(monthLabel(m.month), m)), note: '' };
    }
    return { range: '30D', rows: daily(data.daily), note: NO_YEARLY_NOTE };
  }
  return { range, rows: daily(range === '7D' ? data.daily.slice(-7) : data.daily), note: '' };
}

/** Every order of every series in the rows. */
export function totalOrders(rows: readonly StackedRow[]): number {
  return sum(rows, (row) => sum(Object.values(row.values), (value) => value));
}

/** The two revenue series: merchants and the storefront. */
export const REVENUE_SERIES = [
  { key: 'B2B', label: 'Merchants', color: 's1' },
  { key: 'B2C', label: 'Storefront', color: 's2' },
] as const;

/** Days drawn in the revenue chart: 7 when the range is 7D, else 30 (the demo's rule). */
export function revenueDays(range: ChartRange): 7 | 30 {
  return range === '7D' ? 7 : 30;
}

/** The "Revenue by channel" rows for 7 or 30 days. Money turns into numbers for drawing only. */
export function revenueRows(revenue: ChannelRevenue, days: 7 | 30): StackedRow[] {
  return revenue.daily.slice(-days).map((day) => ({
    label: dayLabel(day.date),
    values: { B2B: toAmount(day.b2b), B2C: toAmount(day.b2c) },
  }));
}

export type RevenueLegend = {
  b2b: string;
  b2c: string;
  b2bAmount: number;
  b2cAmount: number;
  share: number | null;
};

/**
 * The legend figures: the totals the server sends for the period, and the storefront's share of them in percent
 * (`null` when there is no revenue). The share is a display figure; the totals are never added up here.
 */
export function revenueLegend(revenue: ChannelRevenue, days: 7 | 30): RevenueLegend {
  const totals = days === 7 ? revenue.totals.last7Days : revenue.totals.last30Days;
  const b2bAmount = toAmount(totals.b2b);
  const b2cAmount = toAmount(totals.b2c);
  const all = b2bAmount + b2cAmount;
  return {
    b2b: totals.b2b,
    b2c: totals.b2c,
    b2bAmount,
    b2cAmount,
    share: all > 0 ? (b2cAmount / all) * 100 : null,
  };
}
