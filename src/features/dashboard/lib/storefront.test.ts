// Tests for the storefront panel's data: the funnel steps with their share of the step before, the idle test, the six figures.
import { describe, expect, it } from 'vitest';
import { dashboardFixture } from '../test/fixtures';
import { funnelSteps, isStorefrontIdle, storefrontKpis } from './storefront';

const summary = dashboardFixture().storefront!;

describe('funnelSteps', () => {
  it('lists the five steps with each one’s share of the step before and a bar sized to the first', () => {
    const steps = funnelSteps(summary.funnel);
    expect(steps.map((step) => [step.label, step.count])).toEqual([
      ['Visitors (estimated)', 5000],
      ['Checked an IMEI', 900],
      ['Started checkout', 300],
      ['Paid', 104],
      ['Delivered', 98],
    ]);
    expect(steps[0]).toMatchObject({ share: null, width: 100 });
    expect(steps[1].share).toBe('18% of the step before');
    expect(steps[2].share).toBe('33.3% of the step before');
    expect(steps[4].share).toBe('94.2% of the step before');
    expect(steps[1].width).toBeCloseTo(18);
  });

  it('keeps a tiny step visible and an empty one at zero, with no share after an empty step', () => {
    const steps = funnelSteps({
      visitorsEstimated: 100000,
      imeiChecks: 1,
      checkoutsStarted: 0,
      paid: 0,
      delivered: 0,
    });
    expect(steps[1].width).toBe(1.5);
    expect(steps[2].width).toBe(0);
    expect(steps[3].share).toBeNull();
  });
});

describe('isStorefrontIdle', () => {
  it('is true only with no IMEI checks and no paid orders', () => {
    expect(isStorefrontIdle({ ...summary.funnel, imeiChecks: 0, paid: 0 })).toBe(true);
    expect(isStorefrontIdle({ ...summary.funnel, imeiChecks: 0 })).toBe(false);
    expect(isStorefrontIdle(summary.funnel)).toBe(false);
  });
});

describe('storefrontKpis', () => {
  it('formats the six figures with the demo’s notes', () => {
    expect(storefrontKpis(summary)).toEqual([
      { label: 'Average order', value: '$18.50', note: 'Paid, with VAT' },
      { label: 'Refund rate', value: '2.4%', note: 'Of money taken' },
      { label: 'Dispute rate', value: '1.25%', note: 'Disputes per order' },
      { label: 'First reply', value: `30${'\u00a0'}min`, note: 'Median, support' },
      { label: 'Satisfaction', value: '4.6 / 5', note: '12 ratings' },
      { label: 'Held for review', value: '4', note: 'Waiting for a person' },
    ]);
  });

  it('shows a dash for a figure with nothing to divide by', () => {
    const none = storefrontKpis({
      ...summary,
      averageOrder: null,
      refundRate: null,
      disputeRate: null,
      firstReplySeconds: null,
      satisfaction: null,
    });
    expect(none.map((kpi) => kpi.value)).toEqual(['–', '–', '–', '–', '–', '4']);
    expect(none[4].note).toBe('0 ratings');
  });
});
