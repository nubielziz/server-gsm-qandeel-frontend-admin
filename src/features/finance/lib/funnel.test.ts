// Tests for the sales funnel steps: the three labels, each step's share of the one before, and the bar widths.
import { describe, expect, it } from 'vitest';
import { funnelSteps, isFunnelIdle } from './funnel';

const counts = (over: Partial<Parameters<typeof funnelSteps>[0]> = {}) => ({
  paymentStarted: 300,
  paid: 120,
  delivered: 108,
  ...over,
});

describe('funnelSteps', () => {
  it("lists the three steps with the server's counts", () => {
    const steps = funnelSteps(counts());
    expect(steps.map((step) => [step.label, step.count])).toEqual([
      ['Started a payment', 300],
      ['Paid', 120],
      ['Delivered', 108],
    ]);
  });

  it('gives each step its share of the one before, and none for the first', () => {
    const steps = funnelSteps(counts());
    expect(steps.map((step) => step.share)).toEqual([
      null,
      '40% of the step before',
      '90% of the step before',
    ]);
  });

  it('sizes the bars against the biggest step and keeps a small step visible', () => {
    const steps = funnelSteps(counts({ paymentStarted: 1000, paid: 1, delivered: 0 }));
    expect(steps.map((step) => step.width)).toEqual([100, 1.5, 0]);
  });

  it('gives no share after an empty step and does not divide by zero', () => {
    const steps = funnelSteps(counts({ paymentStarted: 0, paid: 5, delivered: 3 }));
    expect(steps.map((step) => step.share)).toEqual([null, null, '60% of the step before']);
  });

  it('keeps every bar inside the track even when a later step is bigger than the first', () => {
    const steps = funnelSteps(counts({ paymentStarted: 10, paid: 40, delivered: 20 }));
    expect(Math.max(...steps.map((step) => step.width))).toBe(100);
  });

  it('ignores a count of the retired IMEI-check step that an older backend still sends', () => {
    const steps = funnelSteps({ ...counts(), imeiChecks: 900 } as Parameters<typeof funnelSteps>[0]);
    expect(steps.map((step) => step.label)).toEqual(['Started a payment', 'Paid', 'Delivered']);
  });
});

describe('isFunnelIdle', () => {
  it('is idle only when every step is zero', () => {
    expect(isFunnelIdle(counts({ paymentStarted: 0, paid: 0, delivered: 0 }))).toBe(true);
    expect(isFunnelIdle(counts({ paymentStarted: 0, paid: 0, delivered: 1 }))).toBe(false);
  });
});
