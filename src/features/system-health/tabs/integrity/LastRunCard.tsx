// LastRunCard: the "Last run" card of the Integrity tab, with the Run check now button in its header. Reads
// GET /admin/system/integrity (route group health); the run itself is POST /admin/system/integrity/run.
import { useState } from 'react';
import { CardSkeleton, HealthCard, type HealthQuery } from '../../components';
import type { IntegrityReport, JobRun } from '../../types';
import { LastRunFacts } from './LastRunFacts';
import { RunCheckControl } from './RunCheckControl';

export interface LastRunCardProps {
  query: HealthQuery<IntegrityReport>;
  /** Poll interval of the report in ms, which is shorter while a run is going. */
  interval: number;
}

/**
 * The card owns the run this staff member just started: the report may not say when the running run began, so the
 * start time of the answer to the POST is what "Running, started 8s ago" counts from.
 */
export function LastRunCard({ query, interval }: LastRunCardProps) {
  const [started, setStarted] = useState<JobRun | null>(null);
  return (
    <HealthCard
      title="Last run"
      sub="The read-only ledger checks, run on a schedule or by hand"
      right={<RunCheckControl running={query.data?.running === true} onStarted={setStarted} />}
      query={query}
      interval={interval}
      skeleton={<CardSkeleton lines={2} />}
      errorTitle="Could not load the integrity check"
      permission="system:read"
    >
      {(report) => <LastRunFacts report={report} started={started} />}
    </HealthCard>
  );
}
