// ProfitReport: profit by day, service, supplier or merchant over the last 7, 30 or 90 days. New (MISMATCHES M124). The server
// works out every figure (revenue, cost, profit, totals); the report shows them as key figures, a chart (by day) and a table.
import { EmptyState, QueryState, SegmentedControl, SkeletonTable } from '@/components/ui';
import { money0, num } from '@/lib/format';
import { useProfitReport } from '../hooks/useReports';
import { dayLabel, PROFIT_GROUPS, PROFIT_RANGES } from '../lib/reports';
import type { ReportChoices } from '../lib/reportView';
import { ProfitChart } from './ProfitChart';
import { ProfitTable } from './ProfitTable';
import { ReportStats } from './ReportStats';

export interface ProfitReportProps {
  choices: ReportChoices;
  onChange: (patch: Partial<ReportChoices>) => void;
}

export function ProfitReport({ choices, onChange }: ProfitReportProps) {
  const report = useProfitReport(choices.by, choices.range);
  const data = report.data;
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
        <SegmentedControl
          label="Split profit by"
          items={PROFIT_GROUPS}
          value={choices.by}
          onChange={(by) => onChange({ by })}
        />
        <SegmentedControl
          label="Period"
          items={PROFIT_RANGES}
          value={choices.range}
          onChange={(range) => onChange({ range })}
        />
        {data && (
          <span className="text-xs text-ink3">
            {dayLabel(data.from)} to {dayLabel(data.to)}, completed orders
          </span>
        )}
      </div>
      <div className="border-t border-line">
        <QueryState
          isLoading={report.isLoading}
          isError={report.isError}
          error={report.error}
          onRetry={() => void report.refetch()}
          errorTitle="Could not load the profit report"
          skeleton={<SkeletonTable cols={5} rows={8} />}
          isEmpty={!data || data.rows.length === 0}
          empty={
            <EmptyState icon="wallet" title="No completed orders in this range">
              Profit shows up here as orders complete.
            </EmptyState>
          }
        >
          {data && (
            <>
              <ReportStats
                label="Profit totals"
                stats={[
                  { label: 'Revenue', value: money0(data.totals.revenue) },
                  { label: 'Supplier cost', value: money0(data.totals.cost) },
                  { label: 'Profit', value: money0(data.totals.profit) },
                  { label: 'Orders', value: num(data.totals.orders) },
                ]}
              />
              {data.groupBy === 'day' && <ProfitChart report={data} />}
              <ProfitTable report={data} />
            </>
          )}
        </QueryState>
      </div>
    </>
  );
}
