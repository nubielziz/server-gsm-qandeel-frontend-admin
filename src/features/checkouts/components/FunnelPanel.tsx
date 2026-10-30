// FunnelPanel: the new "Sales funnel" panel of the checkouts page (`GET /admin/reports/funnel`): check, payment started, paid,
// delivered, over a period the staff member picks. Laid out like the dashboard's storefront funnel (storefrontPanel in 40-p-dashboard.js).
import { EmptyState, ErrorState, Panel, SegmentedControl, SkeletonTable } from '@/components/ui';
import { useFunnel } from '../hooks/useFunnel';
import { funnelSteps, isFunnelIdle } from '../lib/funnel';
import { FUNNEL_PERIODS, type FunnelDays } from '../types';
import { FunnelSteps } from './FunnelSteps';

const PERIOD_ITEMS = FUNNEL_PERIODS.map((days) => ({ value: days, label: `${days} days` }));

export interface FunnelPanelProps {
  days: FunnelDays;
  onDaysChange: (days: FunnelDays) => void;
}

/** The panel with its period selector. The page renders it only for staff with `reports:growth`. */
export function FunnelPanel({ days, onDaysChange }: FunnelPanelProps) {
  const funnel = useFunnel(days, true);
  const report = funnel.data;
  return (
    <Panel
      title="Sales funnel"
      sub={`Last ${days} days. How many people got from an IMEI check to a delivered order.`}
      className="mt-4"
      right={
        <SegmentedControl items={PERIOD_ITEMS} value={days} onChange={onDaysChange} label="Funnel period" />
      }
    >
      {funnel.isError ? (
        <ErrorState
          title="Could not load the funnel"
          error={funnel.error}
          onRetry={() => void funnel.refetch()}
        />
      ) : !report ? (
        <SkeletonTable cols={2} rows={4} />
      ) : isFunnelIdle(report) ? (
        <EmptyState icon="store" title="No activity in this period">
          IMEI checks, payments and orders from the public site appear here.
        </EmptyState>
      ) : (
        <FunnelSteps steps={funnelSteps(report)} label={`Sales funnel, last ${days} days`} />
      )}
    </Panel>
  );
}
