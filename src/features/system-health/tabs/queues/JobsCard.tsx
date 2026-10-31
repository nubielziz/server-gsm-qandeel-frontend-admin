// JobsCard: the "Scheduled jobs" card of the Queues & jobs tab (`GET /admin/system/jobs`). Jobs the server flags come
// first; the healthy ones fold into one quiet line with Show. Run now opens a dialog, History opens `?job=<name>`.
import { useState } from 'react';
import { SkeletonTable } from '@/components/ui';
import { HealthCard, type HealthQuery } from '../../components';
import { POLL } from '../../hooks';
import type { JobsResponse } from '../../types';
import type { QueueDialog } from './dialogState';
import { groupJobs } from './groups';
import { HealthyStrip } from './HealthyStrip';
import { JobsTable } from './JobsTable';
import { countOf } from './text';

export interface JobsCardProps {
  query: HealthQuery<JobsResponse>;
  onDialog: (dialog: QueueDialog) => void;
  onOpenHistory: (job: string) => void;
}

/**
 * Same shape as the Queues card: the card owns only whether the healthy rows are shown. While a job runs, `useJobs`
 * reads every few seconds, so the end of a manual Run now shows soon.
 */
export function JobsCard({ query, onDialog, onOpenHistory }: JobsCardProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <HealthCard
      title="Scheduled jobs"
      sub="Work that runs on a timer. Run now starts one outside its schedule."
      query={query}
      interval={POLL.normal}
      flush
      permission="system:read"
      errorTitle="Could not load the scheduled jobs"
      emptyText="Scheduled jobs appear here once the server reports them."
      isEmpty={(data) => data.jobs.length === 0}
      skeleton={<SkeletonTable cols={5} rows={4} />}
    >
      {(data) => {
        const { attention, calm } = groupJobs(data.jobs);
        const rows = expanded ? [...attention, ...calm] : attention;
        return (
          <>
            <HealthyStrip
              healthy={calm.length}
              noun="job"
              all={attention.length === 0}
              expanded={expanded}
              onToggle={() => setExpanded((open) => !open)}
            >
              <span>{countOf(data.jobs.length, 'job')}</span>
            </HealthyStrip>
            {rows.length > 0 && <JobsTable rows={rows} onDialog={onDialog} onOpenHistory={onOpenHistory} />}
          </>
        );
      }}
    </HealthCard>
  );
}
