// FailedJobItem: one failed job in the failed-jobs drawer: its id and name, why it failed, how often it was tried, when
// and what it was about, with Retry (`system:manage`). A list item, not a table row: the drawer is 580px wide.
import { fmtDate } from '@/lib/format';
import { ActionButton } from '../../components';
import type { FailedJob } from '../../types';
import { attemptsText } from './failed';

export interface FailedJobItemProps {
  job: FailedJob;
  onRetry: () => void;
}

/**
 * The reason can be long (a stack line, a URL), so it wraps and stops at three lines; the whole text is the tooltip. Ids,
 * job names and subjects are mono because the operator searches for them elsewhere.
 */
export function FailedJobItem({ job, onRetry }: FailedJobItemProps) {
  return (
    <li className="px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="mono font-medium">{job.id}</span>
            <span className="mono text-ink3">{job.name}</span>
          </p>
          <p className="mt-1 line-clamp-3 break-words text-sm" title={job.failedReason}>
            {job.failedReason}
          </p>
        </div>
        <ActionButton
          permission="system:manage"
          size="sm"
          aria-label={`Retry job ${job.id}`}
          onClick={onRetry}
        >
          Retry
        </ActionButton>
      </div>
      <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs tabular-nums text-ink3">
        <span>{attemptsText(job)}</span>
        <span>Failed {fmtDate(job.failedAt)}</span>
        {job.subject && <span className="mono">{job.subject}</span>}
      </p>
    </li>
  );
}
