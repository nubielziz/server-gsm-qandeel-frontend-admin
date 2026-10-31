// JobCells: the cells of the Scheduled jobs table that need more than text: the job's name with its label, its schedule
// (the cron text and the server's words for it), the last run and the next run. Route group `health`.
import { ago, fmtDate, useNow } from '@/lib/format';
import { MetaBadge } from '../../components';
import { jobRunMeta } from '../../lib';
import type { JobRun, ScheduledJob } from '../../types';
import { clockText, runDurationText, untilText } from './time';

/** The job's name in mono (the staff member may search for it) with its readable label under it. */
export function JobName({ job }: { job: Pick<ScheduledJob, 'name' | 'label'> }) {
  return (
    <span className="block">
      <span className="mono block">{job.name}</span>
      {job.label && <span className="block text-xs text-ink3">{job.label}</span>}
    </span>
  );
}

/**
 * The cron expression is shown as the server wrote it, in mono. The words under it are the server's too: the console
 * never reads a cron expression, so a server that sends no words gets the expression alone.
 */
export function JobSchedule({ job }: { job: Pick<ScheduledJob, 'schedule' | 'scheduleText'> }) {
  return (
    <span className="block">
      <span className="mono block">{job.schedule}</span>
      {job.scheduleText && <span className="block text-xs text-ink3">{job.scheduleText}</span>}
    </span>
  );
}

/**
 * How the last run ended (badge) with how long ago it started and how long it took; a run that failed or was skipped
 * also shows the server's reason on a second line, cut to one line (the full text is the tooltip, and the History drawer
 * has it whole). The lines are blocks that follow the cell's alignment: left in the table, right in a phone card.
 */
export function LastRun({ run }: { run: JobRun | null }) {
  const now = useNow();
  if (!run) return <span className="text-ink3">Never run</span>;
  const when = [run.startedAt ? ago(run.startedAt, now) : '', runDurationText(run)]
    .filter(Boolean)
    .join(' · ');
  return (
    <span className="block">
      <span className="block">
        <MetaBadge meta={jobRunMeta(run.status)} />
        {when && (
          <span className="ms-2 text-xs tabular-nums text-ink3" title={fmtDate(run.startedAt)}>
            {when}
          </span>
        )}
      </span>
      {run.error && (
        <span className="mt-0.5 block max-w-[18rem] truncate text-xs" title={run.error}>
          {run.error}
        </span>
      )}
    </span>
  );
}

/** The next scheduled time, and how far away it is. No time from the server reads "No data", not a guess. */
export function NextRun({ at }: { at: string | null }) {
  const now = useNow();
  const clock = clockText(at, now);
  if (!clock) return <span className="text-ink3">No data</span>;
  return (
    <span className="block">
      <span className="block tabular-nums">{clock}</span>
      <span className="block text-xs tabular-nums text-ink3">{untilText(at, now)}</span>
    </span>
  );
}
