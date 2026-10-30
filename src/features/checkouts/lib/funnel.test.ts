// Tests for the funnel steps: the four labels, each step's share of the one before, and the bar widths.
import { describe, expect, it } from 'vitest';
import { funnel } from '../test/fixtures';
import { funnelSteps, isFunnelIdle } from './funnel';

describe('funnelSteps', () => {
  it("lists the map's four steps with the server's counts", () => {
    const steps = funnelSteps(funnel());
    expect(steps.map((step) => [step.label, step.count])).toEqual([
      ['Checked an IMEI', 900],
      ['Started a payment', 300],
      ['Paid', 120],
      ['Delivered', 108],
    ]);
  });

  it('gives each step its share of the one before, and none for the first', () => {
    const steps = funnelSteps(funnel());
    expect(steps.map((step) => step.share)).toEqual([
      null,
      '33.3% of the step before',
      '40% of the step before',
      '90% of the step before',
    ]);
  });

  it('sizes the bars against the biggest step and keeps a small step visible', () => {
    const steps = funnelSteps(funnel({ imeiChecks: 1000, paymentStarted: 500, paid: 1, delivered: 0 }));
    expect(steps.map((step) => step.width)).toEqual([100, 50, 1.5, 0]);
  });

  it('gives no share after an empty step and does not divide by zero', () => {
    const steps = funnelSteps(funnel({ imeiChecks: 0, paymentStarted: 5, paid: 0, delivered: 0 }));
    expect(steps.map((step) => step.share)).toEqual([null, null, '0% of the step before', null]);
  });

  it('keeps every bar inside the track even when a later step is bigger than the first', () => {
    const steps = funnelSteps(funnel({ imeiChecks: 10, paymentStarted: 40, paid: 20, delivered: 20 }));
    expect(Math.max(...steps.map((step) => step.width))).toBe(100);
  });
});

describe('isFunnelIdle', () => {
  it('is idle only when every step is zero', () => {
    expect(isFunnelIdle(funnel({ imeiChecks: 0, paymentStarted: 0, paid: 0, delivered: 0 }))).toBe(true);
    expect(isFunnelIdle(funnel({ imeiChecks: 0, paymentStarted: 0, paid: 0, delivered: 1 }))).toBe(false);
  });
});
