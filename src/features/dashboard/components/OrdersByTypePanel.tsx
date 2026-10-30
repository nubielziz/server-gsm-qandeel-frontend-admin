// OrdersByTypePanel: "Orders by type", a stacked bar chart (or its table) of orders per day or month by service type, with
// range and view controls. Ports chartPanel() and chartSpan() of 40-p-dashboard.js, minus the demo's synthetic-history notes.
import { useMemo } from 'react';
import { ChartLegend, SeriesTable, StackedBarChart, useSeriesVisibility } from '@/components/charts';
import { EmptyState, Panel, SegmentedControl, Skeleton, type SegmentItem } from '@/components/ui';
import { num } from '@/lib/format';
import { chartSpan, totalOrders } from '../lib/chart';
import { SCOPE_LABEL } from '../lib/labels';
import type { ChartRange, ChartView } from '../lib/view';
import type { DashboardScope, OrdersByType } from '../types';

const RANGE_ITEMS: readonly SegmentItem<ChartRange>[] = [
  { value: '7D', label: '7D' },
  { value: '30D', label: '30D' },
  { value: '12M', label: '12M' },
];

const VIEW_ITEMS: readonly SegmentItem<ChartView>[] = [
  { value: 'chart', label: 'Chart' },
  { value: 'table', label: 'Table' },
];

const CHART_HEIGHT = 236;

export interface OrdersByTypePanelProps {
  /** `undefined` while the dashboard loads. */
  data: OrdersByType | undefined;
  scope: DashboardScope;
  range: ChartRange;
  chartView: ChartView;
  onRange: (range: ChartRange) => void;
  onChartView: (view: ChartView) => void;
}

/** The orders-by-type chart or table. The range and view are the page's (kept in the address); the legend's hidden series are local. */
export function OrdersByTypePanel({
  data,
  scope,
  range,
  chartView,
  onRange,
  onChartView,
}: OrdersByTypePanelProps) {
  const series = useSeriesVisibility();
  const span = useMemo(() => (data ? chartSpan(data, range) : null), [data, range]);
  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl items={RANGE_ITEMS} value={range} onChange={onRange} label="Date range" />
      <SegmentedControl items={VIEW_ITEMS} value={chartView} onChange={onChartView} label="View" />
    </div>
  );
  if (!span) {
    return (
      <Panel title="Orders by type" right={controls}>
        <Skeleton height={CHART_HEIGHT} />
      </Panel>
    );
  }
  const total = totalOrders(span.rows);
  const unit = span.range === '12M' ? 'month' : 'day';
  return (
    <Panel
      title="Orders by type"
      sub={`${num(total)} orders from ${SCOPE_LABEL[scope]}, ${span.range === '12M' ? 'monthly' : 'per day'}${span.note ? `. ${span.note}` : ''}`}
      right={controls}
    >
      {total === 0 ? (
        <EmptyState icon="layers" title="No orders in this range">
          Order volume by service type shows up here once orders arrive.
        </EmptyState>
      ) : chartView === 'chart' ? (
        <>
          <div className="mb-2">
            <ChartLegend rows={span.rows} hidden={series.hidden} onToggle={series.toggle} />
          </div>
          <StackedBarChart
            rows={span.rows}
            height={CHART_HEIGHT}
            hidden={series.hidden}
            label={`Stacked bar chart of orders per ${unit} by service type, ${span.range}, for ${SCOPE_LABEL[scope]}. ${total} orders in total. Use the Table view for exact numbers.`}
          />
        </>
      ) : (
        <SeriesTable rows={span.rows} />
      )}
    </Panel>
  );
}
