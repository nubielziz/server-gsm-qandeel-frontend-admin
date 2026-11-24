// Tests for the storefront panel's data: the funnel steps with their share of the step before, the idle test, the five figures.
import { describe, expect, it } from 'vitest';
import { dashboardFixture } from '../test/fixtures';
import type { StorefrontSummary } from '../types';
import { funnelSteps, isStorefrontIdle, storefrontKpis } from './storefront';

const summary = dashboardFixture().storefront!;

describe('funnelSteps', () => {
  it('lists the four steps with each one’s share of the step before and a bar sized to the first', () => {
    const steps = funnelSteps(summary.funnel);
    expect(steps.map((step) => [step.label, step.count])).toEqual([
      ['Visitors (estimated)', 5000],
      ['Started checkout', 300],
      ['Paid', 104],
      ['Delivered', 98],
    ]);
    expect(steps[0]).toMatchObject({ share: null, width: 100 });
    expect(steps[1].share).toBe('6% of the step before');
    expect(steps[2].share).toBe('34.7% of the step before');
    expect(steps[3].share).toBe('94.2% of the step before');
    expect(steps[1].width).toBeCloseTo(6);
  });

  it('ignores the count of the retired IMEI-check step that an older backend still sends', () => {
    const steps = funnelSteps({ ...summary.funnel, imeiChecks: 900 } as StorefrontSummary['funnel']);
    expect(steps.map((step) => step.label)).toEqual([
      'Visitors (estimated)',
      'Started checkout',
      'Paid',
      'Delivered',
    ]);
  });

  it('keeps a tiny step visible and an empty one at zero, with no share after an empty step', () => {
    const steps = funnelSteps({
      visitorsEstimated: 100000,
      checkoutsStarted: 1,
      paid: 0,
      delivered: 0,
    });
    expect(steps[1].width).toBe(1.5);
    expect(steps[2].width).toBe(0);
    expect(steps[3].share).toBeNull();
  });
});

describe('isStorefrontIdle', () => {
  it('is true only with no checkouts started and no paid orders', () => {
    expect(isStorefrontIdle({ ...summary.funnel, checkoutsStarted: 0, paid: 0 })).toBe(true);
    expect(isStorefrontIdle({ ...summary.funnel, checkoutsStarted: 0 })).toBe(false);
    expect(isStorefrontIdle(summary.funnel)).toBe(false);
  });
});

describe('storefrontKpis', () => {
  it('formats the five figures with the demo’s notes', () => {
    expect(storefrontKpis(summary)).toEqual([
      { label: 'Average order', value: '$18.50', note: 'Paid, with VAT' },
      { label: 'Refund rate', value: '2.4%', note: 'Of money taken' },
      { label: 'Dispute rate', value: '1.25%', note: 'Disputes per order' },
      { label: 'First reply', value: `30${'\u00a0'}min`, note: 'Median, support' },
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
    });
    expect(none.map((kpi) => kpi.value)).toEqual(['–', '–', '–', '–', '4']);
  });
});
