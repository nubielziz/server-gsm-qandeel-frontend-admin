// Tests for the five key figures: the text of each value, its note, and the change against the previous period.
import { describe, expect, it } from 'vitest';
import type { PeriodStats } from '../types';
import { statCells } from './stats';

const current: PeriodStats = {
  revenue: '1500.0000',
  profit: '300.0000',
  orders: 1240,
  successRate: 95.25,
  medianTurnaroundSeconds: 600,
};
const previous: PeriodStats = {
  revenue: '1000.0000',
  profit: '400.0000',
  orders: 1240,
  successRate: 90,
  medianTurnaroundSeconds: 900,
};

describe('statCells', () => {
  it('lists the five figures in the demo’s order with formatted values', () => {
    const cells = statCells(current, previous, 7);
    expect(cells.map((cell) => cell.label)).toEqual([
      'Revenue',
      'Gross profit',
      'Orders',
      'Success rate',
      'Median turnaround',
    ]);
    expect(cells.map((cell) => cell.value)).toEqual(['$1,500', '$300', '1,240', '95.3%', `10${'\u00a0'}min`]);
  });

  it('compares each figure with the previous period, calling lower turnaround better', () => {
    const [revenue, profit, orders, success, turnaround] = statCells(current, previous, 7).map(
      (cell) => cell.change,
    );
    expect(revenue).toEqual({ kind: 'move', direction: 'up', good: true, text: '50.0%' });
    expect(profit).toEqual({ kind: 'move', direction: 'down', good: false, text: '25.0%' });
    expect(orders).toEqual({ kind: 'flat' });
    expect(success).toEqual({ kind: 'move', direction: 'up', good: true, text: '5.3 pts' });
    expect(turnaround).toEqual({ kind: 'move', direction: 'down', good: true, text: '33.3%' });
  });

  it('says "No earlier data" for every figure when there is no previous period', () => {
    for (const cell of statCells(current, null, 7)) {
      expect(cell.change).toEqual({ kind: 'missing', text: 'No earlier data' });
    }
  });

  it('shows a dash and "No data yet" for rates the period has nothing to measure', () => {
    const quiet: PeriodStats = { ...current, orders: 0, successRate: null, medianTurnaroundSeconds: null };
    const [, , orders, success, turnaround] = statCells(quiet, previous, 7);
    expect(orders.value).toBe('0');
    expect(success).toMatchObject({ value: '–', change: { kind: 'missing', text: 'No data yet' } });
    expect(turnaround).toMatchObject({ value: '–', change: { kind: 'missing', text: 'No data yet' } });
  });

  it('names the period in each note', () => {
    expect(statCells(current, previous, 1)[0].note).toBe(
      'Price of completed orders in the period. Arrows compare with the previous 24 hours.',
    );
    expect(statCells(current, previous, 14)[4].note).toBe(
      'Median time from order created to completed. Arrows compare with the previous 14 days.',
    );
  });
});
