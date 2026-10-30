// RevenuePanel: "Revenue by channel", completed-order revenue per day, merchants against the storefront, before VAT.
// Shown for the All channels view only. Ports channelPanel() of 40-p-dashboard.js.
import { useMemo } from 'react';
import { StackedBarChart, colorVar, compactNumber } from '@/components/charts';
import { EmptyState, Panel, Skeleton } from '@/components/ui';
import { money0, pct } from '@/lib/format';
import { REVENUE_SERIES, revenueDays, revenueLegend, revenueRows } from '../lib/chart';
import type { ChartRange } from '../lib/view';
import type { ChannelRevenue } from '../types';

const CHART_HEIGHT = 200;

export interface RevenuePanelProps {
  /** `undefined` while the dashboard loads; `null` when the server sent no revenue split (the panel then stays out). */
  revenue: ChannelRevenue | null | undefined;
  /** The chart range of the Orders by type panel: 7D draws 7 days, anything else 30. */
  range: ChartRange;
}

/** The revenue chart with legend totals from the server and the storefront's share. Draws nothing when the server sent no split. */
export function RevenuePanel({ revenue, range }: RevenuePanelProps) {
  const days = revenueDays(range);
  const rows = useMemo(() => (revenue ? revenueRows(revenue, days) : []), [revenue, days]);
  if (revenue === null) return null;
  const sub = `Completed orders, last ${days} days, before VAT`;
  if (!revenue) {
    return (
      <Panel title="Revenue by channel" sub={sub}>
        <Skeleton height={CHART_HEIGHT} />
      </Panel>
    );
  }
  const legend = revenueLegend(revenue, days);
  const amounts = [legend.b2bAmount, legend.b2cAmount];
  return (
    <Panel title="Revenue by channel" sub={sub}>
      {legend.share === null ? (
        <EmptyState icon="wallet" title="No completed orders in this range">
          Revenue from merchants and from the storefront shows up here as orders complete.
        </EmptyState>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            {REVENUE_SERIES.map((series, index) => (
              <span key={series.key} className="inline-flex items-center gap-1.5 text-xs text-ink2">
                <span className="h-2 w-2 rounded-sm" style={{ background: colorVar(series.color) }} />
                {series.label}{' '}
                <span className="font-medium tabular-nums text-ink">{money0(amounts[index])}</span>
              </span>
            ))}
            <span className="text-xs text-ink3">Storefront share {pct(legend.share)}</span>
          </div>
          <StackedBarChart
            rows={rows}
            series={REVENUE_SERIES}
            height={CHART_HEIGHT}
            formatValue={money0}
            formatAxis={(value) => `$${compactNumber(value)}`}
            unit="in revenue"
            label={`Stacked bar chart of daily completed revenue, merchants against the storefront, last ${days} days. ${money0(legend.b2bAmount)} from merchants and ${money0(legend.b2cAmount)} from the storefront.`}
          />
        </>
      )}
    </Panel>
  );
}
