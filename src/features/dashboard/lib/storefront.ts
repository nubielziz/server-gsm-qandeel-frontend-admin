// The storefront panel's funnel steps and small figures as data. Ports the `steps` and `kpi` rows of storefrontPanel() in
// 40-p-dashboard.js. The server counts everything; this formats it and works out each step's share of the one before.
import { dur, money, num, pct } from '@/lib/format';
import type { StorefrontSummary } from '../types';

export type FunnelStep = {
  label: string;
  count: number;
  /** "12.5% of the step before", or null for the first step and after an empty step. */
  share: string | null;
  /** Width of the bar in percent of the first step; a non-empty step is at least 1.5 so it stays visible. */
  width: number;
};

/** The five steps, from estimated visitors to delivered orders. */
export function funnelSteps(funnel: StorefrontSummary['funnel']): FunnelStep[] {
  const steps: [string, number][] = [
    ['Visitors (estimated)', funnel.visitorsEstimated],
    ['Checked an IMEI', funnel.imeiChecks],
    ['Started checkout', funnel.checkoutsStarted],
    ['Paid', funnel.paid],
    ['Delivered', funnel.delivered],
  ];
  const max = steps[0][1] || 1;
  return steps.map(([label, count], index) => {
    const before = index > 0 ? steps[index - 1][1] : 0;
    return {
      label,
      count,
      share: before > 0 ? `${pct((count / before) * 100)} of the step before` : null,
      width: count > 0 ? Math.max(1.5, (count / max) * 100) : 0,
    };
  });
}

/** True when the storefront has had no visit-to-order activity at all: the panel then shows its empty state. */
export function isStorefrontIdle(funnel: StorefrontSummary['funnel']): boolean {
  return funnel.paid === 0 && funnel.imeiChecks === 0;
}

export type KpiView = { label: string; value: string; note: string };

// A figure with nothing to divide by.
const NONE = '–';

/** The six small figures under the funnel. */
export function storefrontKpis(summary: StorefrontSummary): KpiView[] {
  return [
    {
      label: 'Average order',
      value: summary.averageOrder === null ? NONE : money(summary.averageOrder),
      note: 'Paid, with VAT',
    },
    {
      label: 'Refund rate',
      value: summary.refundRate === null ? NONE : pct(summary.refundRate),
      note: 'Of money taken',
    },
    {
      label: 'Dispute rate',
      value: summary.disputeRate === null ? NONE : pct(summary.disputeRate, 2),
      note: 'Disputes per order',
    },
    {
      label: 'First reply',
      value: summary.firstReplySeconds ? dur(summary.firstReplySeconds * 1000) : NONE,
      note: 'Median, support',
    },
    {
      label: 'Satisfaction',
      value: summary.satisfaction ? `${summary.satisfaction.average.toFixed(1)} / 5` : NONE,
      note: `${num(summary.satisfaction?.ratings ?? 0)} ratings`,
    },
    { label: 'Held for review', value: num(summary.heldForReview), note: 'Waiting for a person' },
  ];
}
