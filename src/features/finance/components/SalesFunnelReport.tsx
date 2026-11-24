// SalesFunnelReport: how far shop sales got over the last 7, 30 or 90 days: a payment started, paid, delivered, each step with its
// share of the one before. New in the Reports tab (MISMATCHES M124); the server counts every step, the report only shows them.
import { EmptyState, QueryState, SegmentedControl, SkeletonTable } from '@/components/ui';
import { useFunnelReport } from '../hooks/useReports';
import { funnelSteps, isFunnelIdle } from '../lib/funnel';
import type { ReportChoices } from '../lib/reportView';
import { PROFIT_RANGES } from '../lib/reports';
import { FunnelSteps } from './FunnelSteps';

export interface SalesFunnelReportProps {
  choices: ReportChoices;
  onChange: (patch: Partial<ReportChoices>) => void;
}

export function SalesFunnelReport({ choices, onChange }: SalesFunnelReportProps) {
  const report = useFunnelReport(choices.range);
  const data = report.data;
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
        <SegmentedControl
          label="Period"
          items={PROFIT_RANGES}
          value={choices.range}
          onChange={(range) => onChange({ range })}
        />
        <span className="text-xs text-ink3">
          Last {choices.range} days. How many people got from a started payment to a delivered order.
        </span>
      </div>
      <div className="border-t border-line">
        <QueryState
          isLoading={report.isLoading}
          isError={report.isError}
          error={report.error}
          onRetry={() => void report.refetch()}
          errorTitle="Could not load the sales funnel"
          skeleton={<SkeletonTable cols={2} rows={3} />}
          isEmpty={!data || isFunnelIdle(data)}
          empty={
            <EmptyState icon="store" title="No activity in this period">
              Payments and orders from the public site appear here.
            </EmptyState>
          }
        >
          {data && (
            <div className="p-3.5">
              <FunnelSteps steps={funnelSteps(data)} label={`Sales funnel, last ${choices.range} days`} />
            </div>
          )}
        </QueryState>
      </div>
    </>
  );
}
