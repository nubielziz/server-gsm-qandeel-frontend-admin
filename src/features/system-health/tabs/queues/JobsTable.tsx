// JobsTable: the rows of the Scheduled jobs card (route group `health`): name, state, schedule, last run, next run, and
// the controls Run now (`system:manage`) and History. A table from `md` up, cards on a phone (ResponsiveTable).
import { Button, type DataTableColumn } from '@/components/ui';
import { ActionButton, HealthBadge, MetaBadge, ResponsiveTable } from '../../components';
import { jobRunMeta } from '../../lib';
import type { ScheduledJob } from '../../types';
import type { QueueDialog } from './dialogState';
import { JobName, JobSchedule, LastRun, NextRun } from './JobCells';

export interface JobsTableProps {
  rows: readonly ScheduledJob[];
  onDialog: (dialog: QueueDialog) => void;
  onOpenHistory: (job: string) => void;
}

/**
 * Run now is disabled while the server says the job is running (a second start would answer 409); that is a hint, the
 * server still decides. The "Running" badge of the same row says why, so the button carries no title of its own (a
 * disabled button shows none). The buttons name their job for screen readers. The next run drops out on narrower screens.
 */
export function JobsTable({ rows, onDialog, onOpenHistory }: JobsTableProps) {
  const columns: DataTableColumn<ScheduledJob>[] = [
    { key: 'job', label: 'Job', render: (job) => <JobName job={job} /> },
    {
      key: 'state',
      label: 'State',
      render: (job) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <HealthBadge status={job.state} />
          {job.running && <MetaBadge meta={jobRunMeta('running')} />}
        </span>
      ),
    },
    { key: 'schedule', label: 'Schedule', render: (job) => <JobSchedule job={job} /> },
    { key: 'last', label: 'Last run', className: 'py-1.5', render: (job) => <LastRun run={job.lastRun} /> },
    { key: 'next', label: 'Next run', hide: 'lg', render: (job) => <NextRun at={job.nextRunAt} /> },
    {
      key: 'actions',
      label: '',
      className: '[&>*]:align-middle [&>*+*]:ms-1.5',
      render: (job) => (
        <>
          <ActionButton
            permission="system:manage"
            size="sm"
            disabled={job.running}
            aria-label={`Run now ${job.name}`}
            onClick={() => onDialog({ kind: 'run', job })}
          >
            Run now
          </ActionButton>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`History of ${job.name}`}
            onClick={() => onOpenHistory(job.name)}
          >
            History
          </Button>
        </>
      ),
    },
  ];
  return (
    <ResponsiveTable
      footer={false}
      caption="Scheduled jobs"
      columns={columns}
      rows={rows}
      rowKey={(job) => job.name}
      cardTitle="job"
    />
  );
}
