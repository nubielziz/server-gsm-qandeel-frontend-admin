// The Reports tab's choices and how they become dates and chart rows: the profit split and range, the VAT period, day and
// month labels, country names. New in the console (MISMATCHES M124). Nothing here adds money up: the server sends the figures.
import type { SeriesDef, StackedRow } from '@/components/charts';
import { toAmount } from '@/lib/format';
import type { ProfitGroup, ProfitRow } from '../types';

export const PROFIT_GROUPS: readonly { value: ProfitGroup; label: string; column: string }[] = [
  { value: 'day', label: 'Day', column: 'Day' },
  { value: 'service', label: 'Service', column: 'Service' },
  { value: 'supplier', label: 'Supplier', column: 'Supplier' },
  { value: 'client', label: 'Merchant', column: 'Merchant' },
];

/** How many days back the profit report looks, as the address writes it. */
export type ProfitRange = '7' | '30' | '90';

export const PROFIT_RANGES: readonly { value: ProfitRange; label: string }[] = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

export type VatPeriod = 'this-month' | 'last-month' | 'this-quarter' | 'last-quarter';

export const VAT_PERIODS: readonly { value: VatPeriod; label: string }[] = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'this-quarter', label: 'This quarter' },
  { value: 'last-quarter', label: 'Last quarter' },
];

/** A calendar date as the API takes it (`2026-10-28`), in the browser's time zone. */
export function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The first and last day of the profit range: it ends today and starts `range` days back, today included. */
export function profitDates(range: ProfitRange, now: Date = new Date()): { from: string; to: string } {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (Number(range) - 1));
  return { from: isoDate(from), to: isoDate(now) };
}

/** The first and last day of a VAT period, by calendar month or quarter. Only the dates are chosen here. */
export function vatDates(period: VatPeriod, now: Date = new Date()): { from: string; to: string } {
  const quarter = period.endsWith('quarter');
  const size = quarter ? 3 : 1;
  const current = quarter ? Math.floor(now.getMonth() / 3) * 3 : now.getMonth();
  const start = period.startsWith('last') ? current - size : current;
  return {
    from: isoDate(new Date(now.getFullYear(), start, 1)),
    // Day 0 of the next month is the last day of this one.
    to: isoDate(new Date(now.getFullYear(), start + size, 0)),
  };
}

/** The two series of the profit chart: what the supplier cost and what was left. Together they are the day's revenue. */
export const PROFIT_SERIES: readonly SeriesDef[] = [
  { key: 'cost', label: 'Cost', color: 's1' },
  { key: 'profit', label: 'Profit', color: 's3' },
];

const dayMonth = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' });
const monthYear = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' });

/** "28 Oct" for the key `2026-10-28`; a key that is not a date is returned as it is. */
export function dayLabel(key: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  return match ? dayMonth.format(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : key;
}

/** "Oct 2026" for the period `2026-10`; anything else is returned as it is. */
export function monthLabel(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  return match ? monthYear.format(new Date(Number(match[1]), Number(match[2]) - 1, 1)) : period;
}

let regionNames: Intl.DisplayNames | undefined;

/** "United Kingdom" for `GB`; a code the browser does not know is returned as it is. */
export function countryName(code: string): string {
  try {
    regionNames ??= new Intl.DisplayNames(['en'], { type: 'region' });
    return regionNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/**
 * The bars of the profit-by-day chart, oldest day first. The chart needs plain numbers to draw, so the server's money
 * strings are read as numbers here for drawing only. A loss is drawn as zero (a stacked bar has no negative side); the
 * table beside the chart shows the real figure.
 */
export function profitChartRows(rows: readonly ProfitRow[]): StackedRow[] {
  return rows
    .slice()
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((row) => ({
      label: dayLabel(row.key),
      values: {
        cost: Math.max(0, toAmount(row.cost)),
        profit: Math.max(0, toAmount(row.profit)),
      },
    }));
}
