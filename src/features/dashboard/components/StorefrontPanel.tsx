// StorefrontPanel: "Storefront funnel", the five steps from estimated visitors to delivered orders, and six small figures
// under it. Covers the last 30 days whatever the period. Ports storefrontPanel() of 40-p-dashboard.js.
import { EmptyState, Panel, SkeletonTable } from '@/components/ui';
import { num } from '@/lib/format';
import { funnelSteps, isStorefrontIdle, storefrontKpis } from '../lib/storefront';
import type { StorefrontSummary } from '../types';

const SUB = 'Last 30 days. Visitor numbers are estimated from IMEI checks.';

export interface StorefrontPanelProps {
  /** `undefined` while the dashboard loads; `null` when the server sent none (the panel then stays out). */
  summary: StorefrontSummary | null | undefined;
}

/** The funnel and its six figures, an empty state for an idle storefront, and nothing when the server sent no storefront block. */
export function StorefrontPanel({ summary }: StorefrontPanelProps) {
  if (summary === null) return null;
  if (!summary) {
    return (
      <Panel title="Storefront funnel" sub={SUB}>
        <SkeletonTable cols={2} rows={5} />
      </Panel>
    );
  }
  if (isStorefrontIdle(summary.funnel)) {
    return (
      <Panel title="Storefront funnel" sub={SUB}>
        <EmptyState icon="store" title="No storefront activity yet">
          Visits, IMEI checks and orders from the public site appear here.
        </EmptyState>
      </Panel>
    );
  }
  return (
    <Panel title="Storefront funnel" sub={SUB}>
      <ol className="m-0 list-none space-y-2.5 p-0" aria-label="Storefront funnel, last 30 days">
        {funnelSteps(summary.funnel).map((step) => (
          <li key={step.label}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="text-ink2">{step.label}</span>
              <span className="tabular-nums">
                <strong className="font-semibold">{num(step.count)}</strong>
                {step.share && <span className="text-xs text-ink3"> {step.share}</span>}
              </span>
            </div>
            <div className="meter mt-1 w-full">
              <i style={{ width: `${step.width}%`, background: 'rgb(var(--s2))' }} />
            </div>
          </li>
        ))}
      </ol>
      <dl className="m-0 mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3.5 sm:grid-cols-3">
        {storefrontKpis(summary).map((kpi) => (
          <div key={kpi.label} className="min-w-0">
            <dt className="text-xs text-ink3">{kpi.label}</dt>
            <dd className="m-0 mt-0.5 text-lg font-semibold tabular-nums">{kpi.value}</dd>
            <p className="text-2xs text-ink3">{kpi.note}</p>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
