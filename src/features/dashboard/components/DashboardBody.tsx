// DashboardBody: the stat strip and the two columns of panels, in the demo's order. The left column is the work (attention,
// charts, funnel), the right is the state of the system (queues, suppliers, top lists). Which panels show depends on the channel.
// Ports the layout of pageDashboard() in 40-p-dashboard.js. `data` is undefined while loading: every panel draws its skeleton.
import type { ChartRange, ChartView } from '../lib/view';
import type { Dashboard, DashboardDays, DashboardScope } from '../types';
import { AttentionPanel } from './AttentionPanel';
import { OrdersByTypePanel } from './OrdersByTypePanel';
import { QueuePanel } from './QueuePanel';
import { RevenuePanel } from './RevenuePanel';
import { StatStrip } from './StatStrip';
import { StorefrontPanel } from './StorefrontPanel';
import { SupplierPanel } from './SupplierPanel';
import { TopCustomersPanel } from './TopCustomersPanel';
import { TopMerchantsPanel } from './TopMerchantsPanel';

export interface DashboardBodyProps {
  data: Dashboard | undefined;
  scope: DashboardScope;
  days: DashboardDays;
  range: ChartRange;
  chartView: ChartView;
  onRange: (range: ChartRange) => void;
  onChartView: (view: ChartView) => void;
  /** Whether the staff member has `reports:read`, which the top merchants list needs. */
  canSeeReports: boolean;
  /**
   * `data` is the last answer, kept while the one for a new channel or period loads. A panel the old channel did not
   * have (`null` there) then draws its skeleton instead of vanishing and popping back in.
   */
  placeholder?: boolean;
}

/** Lays the panels out for the channel being shown. Each panel gets its slice of the payload, or `undefined` to draw its skeleton. */
export function DashboardBody({
  data,
  scope,
  days,
  range,
  chartView,
  onRange,
  onChartView,
  canSeeReports,
  placeholder = false,
}: DashboardBodyProps) {
  // A part the old answer lacks reads as "still loading" while it is only a placeholder.
  const part = <T,>(value: T | null | undefined): T | null | undefined =>
    value === null && placeholder ? undefined : value;
  return (
    <>
      <StatStrip stats={data?.stats} days={days} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <AttentionPanel items={data?.attention} scope={scope} />
          <OrdersByTypePanel
            data={data?.ordersByType}
            scope={scope}
            range={range}
            chartView={chartView}
            onRange={onRange}
            onChartView={onChartView}
          />
          {scope === 'all' && (
            <RevenuePanel revenue={data ? part(data.revenueByChannel) : undefined} range={range} />
          )}
          {scope !== 'b2b' && <StorefrontPanel summary={data ? part(data.storefront) : undefined} />}
        </div>
        <div className="min-w-0 space-y-4">
          <QueuePanel queues={data?.queues} scope={scope} />
          <SupplierPanel suppliers={data?.suppliers} />
          {scope !== 'b2c' && canSeeReports && <TopMerchantsPanel days={days} />}
          {scope !== 'b2b' && (
            <TopCustomersPanel customers={data ? part(data.topCustomers) : undefined} days={days} />
          )}
        </div>
      </div>
    </>
  );
}
