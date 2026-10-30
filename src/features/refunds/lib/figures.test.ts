// Tests for the strip's figures: which cells a permission gives, and the demo's sentences under them.
import { describe, expect, it } from 'vitest';
import { stripCells, type RefundFigures } from './figures';
import type { PaymentsTotals } from '../types';

const NOW = Date.parse('2026-01-01T12:00:00Z');
const HOUR = 3_600_000;
const all = (_permission: string) => true;

const totals: PaymentsTotals = {
  refundedCount: 7,
  refundedAmount: '111.4000',
  refundedPercentOfSales: '7.7',
  awaitingAmount: '48.9000',
  chargebackLoss: '45.5900',
};

const full: RefundFigures = {
  requested: 3,
  failed: 1,
  needsResponse: 2,
  underReview: 1,
  nextDue: { id: 2004, evidenceDueAt: new Date(NOW + 50 * HOUR).toISOString() },
  totals,
};

const byLabel = (figures: RefundFigures, can = all) =>
  Object.fromEntries(stripCells(figures, NOW, can).map((cell) => [cell.label, cell]));

describe('stripCells', () => {
  it('shows the four figures with the server’s money', () => {
    const cells = byLabel(full);
    expect(Object.keys(cells)).toEqual([
      'Refunded, 30 days',
      'Waiting for you',
      'Card disputes open',
      'Lost to chargebacks',
    ]);
    expect(cells['Refunded, 30 days']).toMatchObject({ value: '$111', sub: '7 refunds · 7.7% of sales' });
    expect(cells['Waiting for you']).toMatchObject({
      value: 4,
      className: 'text-warn-fg',
      sub: '$49 · 1 failed at the gateway',
    });
    expect(cells['Card disputes open']).toMatchObject({
      value: 3,
      sub: 'Evidence for DP-2004 due in 2d 2h',
      className: 'text-crit-fg',
    });
    expect(cells['Lost to chargebacks']).toMatchObject({
      value: '$46',
      sub: 'All time, with the dispute fees',
    });
  });

  it('says so when nothing waits', () => {
    const cells = byLabel({
      ...full,
      requested: 0,
      failed: 0,
      needsResponse: 0,
      underReview: 0,
      nextDue: null,
    });
    expect(cells['Waiting for you']).toMatchObject({ value: 0, sub: 'No requests open' });
    expect(cells['Waiting for you'].className).toBeUndefined();
    expect(cells['Card disputes open']).toMatchObject({ value: 0, sub: 'None open' });
    expect(cells['Refunded, 30 days'].sub).toBe('7 refunds · 7.7% of sales');
  });

  it('keeps the disputes figure calm when the next deadline is more than three days away', () => {
    const far = { ...full, nextDue: { id: 2005, evidenceDueAt: new Date(NOW + 100 * HOUR).toISOString() } };
    expect(byLabel(far)['Card disputes open'].className).toBeUndefined();
  });

  it('says "with the card network" when disputes are open but none needs evidence', () => {
    expect(
      byLabel({ ...full, needsResponse: 0, underReview: 2, nextDue: null })['Card disputes open'],
    ).toMatchObject({
      value: 2,
      sub: 'With the card network',
    });
  });

  it('says a deadline has passed instead of "due in <1m"', () => {
    const late = { ...full, nextDue: { id: 2004, evidenceDueAt: new Date(NOW - 5 * HOUR).toISOString() } };
    expect(byLabel(late)['Card disputes open'].sub).toBe('Evidence for DP-2004 was due 5h ago');
  });

  it('shows a dash for a figure whose call has not answered, and leaves the money out of the sentence', () => {
    const cells = byLabel({ requested: 2, failed: 0 });
    expect(cells['Refunded, 30 days'].value).toBe('–');
    expect(cells['Lost to chargebacks'].value).toBe('–');
    expect(cells['Card disputes open'].value).toBe('–');
    expect(cells['Waiting for you'].sub).toBe('0 failed at the gateway');
    expect(byLabel({})['Waiting for you'].value).toBe('–');
  });

  it('leaves out the figures the staff member may not read', () => {
    const onlyRefunds = (permission: string) => permission === 'refunds:read';
    expect(Object.keys(byLabel(full, onlyRefunds))).toEqual(['Waiting for you']);
    expect(Object.keys(byLabel(full, (permission) => permission === 'disputes:read'))).toEqual([
      'Card disputes open',
    ]);
    expect(Object.keys(byLabel(full, (permission) => permission === 'reports:finance'))).toEqual([
      'Refunded, 30 days',
      'Lost to chargebacks',
    ]);
    expect(stripCells(full, NOW, () => false)).toEqual([]);
  });

  it('writes one refund in the singular', () => {
    const one = { ...full, totals: { ...totals, refundedCount: 1 } };
    expect(byLabel(one)['Refunded, 30 days'].sub).toBe('1 refund · 7.7% of sales');
  });
});
