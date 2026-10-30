// Tests for the chart rows: date labels, the 7D / 30D / 12M ranges, the 12M fallback, and the revenue legend.
import { describe, expect, it } from 'vitest';
import { dashboardFixture } from '../test/fixtures';
import {
  chartSpan,
  dayLabel,
  monthLabel,
  NO_YEARLY_NOTE,
  revenueDays,
  revenueLegend,
  revenueRows,
  totalOrders,
} from './chart';

const { ordersByType, revenueByChannel } = dashboardFixture();

describe('labels', () => {
  it('writes a calendar day and month the way the demo does, whatever the time zone', () => {
    expect(dayLabel('2026-10-30')).toBe('30 Oct');
    expect(dayLabel('2026-01-02T23:30:00.000Z')).toBe('2 Jan');
    expect(monthLabel('2026-03')).toBe('Mar');
  });

  it('shows text that is not a date as it came', () => {
    expect(dayLabel('someday')).toBe('someday');
    expect(monthLabel('later')).toBe('later');
  });
});

describe('chartSpan', () => {
  it('draws 30 days by default and the last 7 for 7D', () => {
    const month = chartSpan(ordersByType, '30D');
    expect(month).toMatchObject({ range: '30D', note: '' });
    expect(month.rows).toHaveLength(30);
    expect(month.rows[29].label).toBe('30 Oct');
    expect(chartSpan(ordersByType, '7D').rows.map((row) => row.label)).toEqual(
      month.rows.slice(-7).map((row) => row.label),
    );
  });

  it('names the four series with the kit’s keys', () => {
    expect(Object.keys(chartSpan(ordersByType, '30D').rows[0].values)).toEqual([
      'IMEI',
      'Server',
      'Remote',
      'File',
    ]);
  });

  it('draws the twelve months for 12M', () => {
    const year = chartSpan(ordersByType, '12M');
    expect(year.range).toBe('12M');
    expect(year.rows).toHaveLength(12);
    expect(year.rows[0].values).toMatchObject({ IMEI: 100, Server: 30 });
  });

  it('falls back to 30 days with the demo’s note when there is no yearly history', () => {
    const none = chartSpan({ ...ordersByType, monthly: null }, '12M');
    expect(none.range).toBe('30D');
    expect(none.rows).toHaveLength(30);
    expect(none.note).toBe(NO_YEARLY_NOTE);
    expect(NO_YEARLY_NOTE).toBe('The storefront has no yearly history yet, so this shows 30 days.');
  });

  it('adds up every order of every series', () => {
    const rows = chartSpan(ordersByType, '7D').rows;
    expect(totalOrders(rows)).toBe(
      ordersByType.daily
        .slice(-7)
        .reduce((sum, day) => sum + day.imei + day.server + day.remote + day.file, 0),
    );
    expect(totalOrders([])).toBe(0);
  });
});

describe('revenue', () => {
  it('uses 7 days for the 7D range and 30 otherwise', () => {
    expect(revenueDays('7D')).toBe(7);
    expect(revenueDays('30D')).toBe(30);
    expect(revenueDays('12M')).toBe(30);
  });

  it('turns the money strings into numbers only to draw', () => {
    const rows = revenueRows(revenueByChannel!, 7);
    expect(rows).toHaveLength(7);
    expect(typeof rows[0].values.B2B).toBe('number');
    expect(rows[6].label).toBe('30 Oct');
  });

  it('takes the legend totals from the server and works out the storefront share', () => {
    const legend = revenueLegend(revenueByChannel!, 30);
    expect(legend).toMatchObject({ b2b: '3000.0000', b2c: '1000.0000', b2bAmount: 3000, b2cAmount: 1000 });
    expect(legend.share).toBe(25);
    expect(revenueLegend(revenueByChannel!, 7).share).toBe(30);
  });

  it('has no share when nothing was earned', () => {
    const none = {
      ...revenueByChannel!,
      totals: { ...revenueByChannel!.totals, last7Days: { b2b: '0.0000', b2c: '0.0000' } },
    };
    expect(revenueLegend(none, 7).share).toBeNull();
  });
});
