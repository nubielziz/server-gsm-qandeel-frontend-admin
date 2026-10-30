// Tests for the Reports tab helpers: the dates behind the choices, labels, and the chart rows.
import { describe, expect, it } from 'vitest';
import { countryName, dayLabel, monthLabel, profitChartRows, profitDates, vatDates } from './reports';
import { parseReportChoices, resolveReport, visibleReports, writeReportChoices } from './reportView';

const NOON = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

describe('profitDates', () => {
  it('ends today and starts the given number of days back, today included', () => {
    expect(profitDates('7', NOON(2026, 10, 30))).toEqual({ from: '2026-10-24', to: '2026-10-30' });
    expect(profitDates('30', NOON(2026, 3, 15))).toEqual({ from: '2026-02-14', to: '2026-03-15' });
  });
});

describe('vatDates', () => {
  const now = NOON(2026, 10, 30);

  it('covers a calendar month', () => {
    expect(vatDates('this-month', now)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(vatDates('last-month', now)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
  });

  it('covers a calendar quarter', () => {
    expect(vatDates('this-quarter', now)).toEqual({ from: '2026-10-01', to: '2026-12-31' });
    expect(vatDates('last-quarter', now)).toEqual({ from: '2026-07-01', to: '2026-09-30' });
  });

  it('crosses the new year', () => {
    expect(vatDates('last-month', NOON(2026, 1, 10))).toEqual({ from: '2025-12-01', to: '2025-12-31' });
    expect(vatDates('last-quarter', NOON(2026, 2, 10))).toEqual({ from: '2025-10-01', to: '2025-12-31' });
  });
});

describe('labels', () => {
  it('shortens a day and a month', () => {
    expect(dayLabel('2026-10-28')).toBe('28 Oct');
    expect(dayLabel('later')).toBe('later');
    expect(monthLabel('2026-10')).toBe('Oct 2026');
  });

  it('names a country, and keeps a code it cannot name', () => {
    expect(countryName('GB')).toBe('United Kingdom');
    expect(countryName('gb')).toBe('United Kingdom');
    expect(countryName('not a code')).toBe('not a code');
  });
});

describe('profitChartRows', () => {
  it('puts the days oldest first and draws a loss as zero', () => {
    const rows = profitChartRows([
      {
        key: '2026-10-29',
        label: '2026-10-29',
        orders: 1,
        revenue: '10.0000',
        cost: '12.0000',
        profit: '-2.0000',
      },
      {
        key: '2026-10-28',
        label: '2026-10-28',
        orders: 2,
        revenue: '30.0000',
        cost: '20.0000',
        profit: '10.0000',
      },
    ]);
    expect(rows).toEqual([
      { label: '28 Oct', values: { cost: 20, profit: 10 } },
      { label: '29 Oct', values: { cost: 12, profit: 0 } },
    ]);
  });
});

describe('report choices in the address', () => {
  it('fall back to the defaults and leave a default out of the address', () => {
    expect(parseReportChoices(new URLSearchParams('by=bogus&range=1'))).toEqual({
      by: 'day',
      range: '30',
      period: 'last-month',
    });
    expect(writeReportChoices(new URLSearchParams('report=profit'), { by: 'client' }).toString()).toBe(
      'report=profit&by=client',
    );
    expect(writeReportChoices(new URLSearchParams('by=client'), { by: 'day' }).toString()).toBe('');
  });

  it('offer each role the reports it may read', () => {
    expect(visibleReports(['reports:read']).map((report) => report.id)).toEqual(['profit', 'exposure']);
    expect(visibleReports(['reports:finance']).map((report) => report.id)).toEqual(['vat']);
    expect(resolveReport('vat', visibleReports(['reports:read']))).toBe('profit');
    expect(resolveReport('vat', visibleReports(['*']))).toBe('vat');
    expect(resolveReport(null, [])).toBeUndefined();
  });
});
