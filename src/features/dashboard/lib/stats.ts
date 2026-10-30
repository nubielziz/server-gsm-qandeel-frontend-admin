// The five key figures of the stat strip as data: label, note, value text and the change against the period before.
// Ports statStrip() of 40-p-dashboard.js. The server sends both periods; this only formats them and words the change.
import { dur, money0, num, pct, toAmount } from '@/lib/format';
import type { DashboardDays, PeriodStats } from '../types';
import { delta, type Delta } from './delta';
import { periodWords } from './labels';

export type StatCellView = {
  label: string;
  /** What the figure means, with the sentence about the arrows added. Opens from the (i) button. */
  note: string;
  value: string;
  change: Delta;
};

// A figure the period has none of ("–") when the server sends null.
const NONE = '–';

/**
 * The cells in the demo's order. `previous` is `null` when there is no earlier period; every change then says
 * "No earlier data".
 */
export function statCells(
  current: PeriodStats,
  previous: PeriodStats | null,
  days: DashboardDays,
): StatCellView[] {
  const arrows = ` Arrows compare with the previous ${periodWords(days)}.`;
  const money = (value: string | undefined) => (value === undefined ? null : toAmount(value));
  return [
    {
      label: 'Revenue',
      note: `Price of completed orders in the period.${arrows}`,
      value: money0(current.revenue),
      change: delta(toAmount(current.revenue), money(previous?.revenue)),
    },
    {
      label: 'Gross profit',
      note: `Completed order price minus supplier cost.${arrows}`,
      value: money0(current.profit),
      change: delta(toAmount(current.profit), money(previous?.profit)),
    },
    {
      label: 'Orders',
      note: `Orders created in the period, any status.${arrows}`,
      value: num(current.orders),
      change: delta(current.orders, previous?.orders),
    },
    {
      label: 'Success rate',
      note: `Completed divided by completed plus rejected.${arrows}`,
      value: current.successRate === null ? NONE : pct(current.successRate, 1),
      change: delta(current.successRate, previous?.successRate, { kind: 'pp' }),
    },
    {
      label: 'Median turnaround',
      note: `Median time from order created to completed.${arrows}`,
      value: current.medianTurnaroundSeconds === null ? NONE : dur(current.medianTurnaroundSeconds * 1000),
      change: delta(current.medianTurnaroundSeconds, previous?.medianTurnaroundSeconds, {
        lowerBetter: true,
      }),
    },
  ];
}
