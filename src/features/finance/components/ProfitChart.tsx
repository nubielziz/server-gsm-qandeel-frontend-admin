// ProfitChart: the profit-by-day chart: one bar per day, cost and profit stacked so the bar is the day's revenue. New
// (MISMATCHES M124); built on the chart kit ported from 30-charts.js. The table below the chart holds the exact figures.
import { StackedBarChart, colorVar, compactNumber } from '@/components/charts';
import { money0 } from '@/lib/format';
import { PROFIT_SERIES, profitChartRows } from '../lib/reports';
import type { ProfitReport } from '../types';

export function ProfitChart({ report }: { report: ProfitReport }) {
  const rows = profitChartRows(report.rows);
  const totals = report.totals;
  return (
    <div className="px-3.5 pb-3 pt-3">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {PROFIT_SERIES.map((series) => (
          <span key={series.key} className="inline-flex items-center gap-1.5 text-xs text-ink2">
            <span className="h-2 w-2 rounded-sm" style={{ background: colorVar(series.color) }} />
            {series.label}{' '}
            <span className="font-medium tabular-nums text-ink">
              {money0(series.key === 'cost' ? totals.cost : totals.profit)}
            </span>
          </span>
        ))}
        <span className="text-xs text-ink3">Each bar is the day’s revenue.</span>
      </div>
      <StackedBarChart
        rows={rows}
        series={PROFIT_SERIES}
        height={200}
        unit="in revenue"
        formatValue={(n) => money0(n)}
        formatAxis={(n) => `$${compactNumber(n)}`}
        label={`Stacked bar chart of daily revenue split into cost and profit. ${money0(totals.profit)} profit on ${money0(totals.revenue)} revenue, ${totals.orders} orders.`}
      />
    </div>
  );
}
