// ChecksCard: the "Ledger checks" card of the Integrity tab: the four checks of the last run with pass, fail or not checked,
// the count and the difference. Reads GET /admin/system/integrity (route group health).
import { useState } from 'react';
import { SkeletonTable } from '@/components/ui';
import { HealthCard, type HealthQuery } from '../../components';
import type { IntegrityReport } from '../../types';
import { ChecksTable } from './ChecksTable';

export interface ChecksCardProps {
  query: HealthQuery<IntegrityReport>;
  /** Poll interval of the report in ms, which is shorter while a run is going. */
  interval: number;
}

/** An answer without checks is "No data" in neutral: a ledger nobody has checked is not a healthy ledger. */
export function ChecksCard({ query, interval }: ChecksCardProps) {
  // Whether the passed checks are listed. The card keeps it, so a poll does not fold the list back up.
  const [showPassing, setShowPassing] = useState(false);
  return (
    <HealthCard
      title="Ledger checks"
      sub="What the last run checked, failed checks first"
      query={query}
      interval={interval}
      flush
      skeleton={<SkeletonTable cols={4} rows={4} />}
      isEmpty={(report) => report.checks.length === 0}
      emptyText="The four ledger checks appear here after the first run."
      errorTitle="Could not load the ledger checks"
      permission="system:read"
    >
      {(report) => (
        <ChecksTable
          checks={report.checks}
          showPassing={showPassing}
          onTogglePassing={() => setShowPassing((open) => !open)}
        />
      )}
    </HealthCard>
  );
}
