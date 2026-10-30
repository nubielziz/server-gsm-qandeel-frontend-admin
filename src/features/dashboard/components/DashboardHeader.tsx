// DashboardHeader: the page title, the date line and the Channel and Period controls (the demo's pageHead in 40-p-dashboard.js).
import { PageHeader, SegmentedControl } from '@/components/ui';
import { useNow } from '@/lib/format';
import { PERIOD_ITEMS, SCOPE_ITEMS, SCOPE_LABEL } from '../lib/labels';
import type { DashboardDays, DashboardScope } from '../types';

const TODAY = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

export interface DashboardHeaderProps {
  scope: DashboardScope;
  days: DashboardDays;
  onScope: (scope: DashboardScope) => void;
  onDays: (days: DashboardDays) => void;
}

/** The title row: today's date, the channel being shown and the two controls, whose values the page keeps in the address. */
export function DashboardHeader({ scope, days, onScope, onDays }: DashboardHeaderProps) {
  // A page left open overnight must not keep yesterday's date.
  const now = useNow(60_000);
  return (
    <PageHeader
      title="Dashboard"
      sub={`${TODAY.format(now)}. Showing ${SCOPE_LABEL[scope]}. Figures cover orders created in the selected period.`}
      actions={
        <>
          <SegmentedControl items={SCOPE_ITEMS} value={scope} onChange={onScope} label="Channel" />
          <SegmentedControl items={PERIOD_ITEMS} value={days} onChange={onDays} label="Period" />
        </>
      }
    />
  );
}
