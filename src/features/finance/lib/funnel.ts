// The sales funnel report's steps as data: a label, the server's count, the share of the step before and a bar width. The same
// markup as the dashboard's storefront funnel; the server counts every step, this only formats and sizes them. New in the console
// (MISMATCHES M124).
import { pct } from '@/lib/format';
import type { FunnelReport } from '../types';

export type FunnelStep = {
  label: string;
  count: number;
  /** "12.5% of the step before", or null for the first step and after an empty step. */
  share: string | null;
  /** Width of the bar in percent of the biggest step; a non-empty step is at least 1.5 so it stays visible. */
  width: number;
};

type FunnelCounts = Pick<FunnelReport, 'paymentStarted' | 'paid' | 'delivered'>;

/** The three steps in order. */
export function funnelSteps(report: FunnelCounts): FunnelStep[] {
  const steps: [string, number][] = [
    ['Started a payment', report.paymentStarted],
    ['Paid', report.paid],
    ['Delivered', report.delivered],
  ];
  // The bars share one scale. A step can be bigger than the one before (orders that never had a checkout), so the biggest one sets it.
  const max = Math.max(1, ...steps.map(([, count]) => count));
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

/** True when nobody reached any step: the report then shows its empty state. */
export function isFunnelIdle(report: FunnelCounts): boolean {
  return report.paymentStarted === 0 && report.paid === 0 && report.delivered === 0;
}
