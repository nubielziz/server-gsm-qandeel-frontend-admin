// The funnel panel's steps as data: a label, the server's count, the share of the step before and a bar width. Ports the `steps`
// row of storefrontPanel() in 40-p-dashboard.js, with the map's four steps (check, payment started, paid, delivered). The server
// counts every step; this only formats and sizes them.
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

/** The four steps in order. */
export function funnelSteps(
  report: Pick<FunnelReport, 'imeiChecks' | 'paymentStarted' | 'paid' | 'delivered'>,
): FunnelStep[] {
  const steps: [string, number][] = [
    ['Checked an IMEI', report.imeiChecks],
    ['Started a payment', report.paymentStarted],
    ['Paid', report.paid],
    ['Delivered', report.delivered],
  ];
  // The bars share one scale. A step can be bigger than the one before (orders that never had a check), so the biggest one sets it.
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

/** True when nobody reached any step: the panel then shows its empty state. */
export function isFunnelIdle(
  report: Pick<FunnelReport, 'imeiChecks' | 'paymentStarted' | 'paid' | 'delivered'>,
): boolean {
  return (
    report.imeiChecks === 0 && report.paymentStarted === 0 && report.paid === 0 && report.delivered === 0
  );
}
