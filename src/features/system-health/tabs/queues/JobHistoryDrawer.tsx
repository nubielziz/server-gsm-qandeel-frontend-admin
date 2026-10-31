// JobHistoryDrawer: the side sheet with the run history of one scheduled job, opened by `?job=<name>`
// (`GET /admin/system/jobs?job=<name>`). Newest run first. Closing it clears `?job=`.
import { Button, Drawer, EmptyState, SkeletonTable } from '@/components/ui';
import { ActionButton, HealthCard } from '../../components';
import { PartBoundary } from '../../header/PartBoundary';
import { POLL, useJobs } from '../../hooks';
import type { QueueDialog } from './dialogState';
import { RunItem } from './RunItem';
import { countOf } from './text';

export interface JobHistoryDrawerProps {
  job: string;
  onClose: () => void;
  onDialog: (dialog: QueueDialog) => void;
}

/**
 * The history comes with the job list of the same read, so the job's label and schedule words are at hand for the title.
 * Run now sits in the foot: after reading a failed run it is the next thing the staff member wants. While the job runs
 * the button is off, and the list shows that run as "Running" (a disabled button shows no title). The list is a
 * HealthCard whose title is the number of runs, like the failed-jobs drawer.
 */
export function JobHistoryDrawer({ job, onClose, onDialog }: JobHistoryDrawerProps) {
  const query = useJobs({ job });
  const scheduled = query.data?.jobs.find((item) => item.name === job);
  // A run that is still working shows as "Running"; useJobs reads every few seconds until it has ended.
  const words = scheduled && (scheduled.scheduleText || scheduled.schedule);

  return (
    <Drawer
      open
      onClose={onClose}
      title={scheduled?.label || job}
      sub={
        <>
          <span className="mono">{job}</span>
          {words && ` · ${words}`}
        </>
      }
      footer={
        <>
          {scheduled && (
            <ActionButton
              permission="system:manage"
              disabled={scheduled.running}
              onClick={() => onDialog({ kind: 'run', job: scheduled })}
            >
              Run now
            </ActionButton>
          )}
          <span className="flex-1" />
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <HealthCard
        title={query.data ? countOf(query.data.runs.length, 'run') : 'Runs'}
        sub="Newest first."
        query={query}
        interval={POLL.normal}
        flush
        permission="system:read"
        errorTitle={`Could not load the history of ${job}`}
        skeleton={<SkeletonTable cols={2} rows={5} />}
      >
        {(data) => (
          <PartBoundary name="The run history" resetKey={query.dataUpdatedAt}>
            {data.runs.length === 0 ? (
              <EmptyState title="No runs recorded">
                Runs of {job} appear here, newest first, once it has run.
              </EmptyState>
            ) : (
              <ul aria-label={`Runs of ${job}`} className="m-0 list-none divide-y divide-line p-0">
                {data.runs.map((run) => (
                  <RunItem key={run.id} run={run} />
                ))}
              </ul>
            )}
          </PartBoundary>
        )}
      </HealthCard>
    </Drawer>
  );
}
