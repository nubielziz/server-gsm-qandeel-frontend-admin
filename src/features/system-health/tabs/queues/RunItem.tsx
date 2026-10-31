// RunItem: one run of a scheduled job in the history drawer: how it ended, when it started, how long it took, who or what
// started it, how many items it handled, the error if it failed and the job's own result summary. Route group `health`.
import { fmtDate, num } from '@/lib/format';
import { MetaBadge } from '../../components';
import { jobRunMeta } from '../../lib';
import type { JobRun } from '../../types';
import { summarizeResult, triggerText } from './runText';
import { runDurationText } from './time';

/**
 * The count of items is shown for runs that ended; a run that is still working or was skipped has no count worth
 * showing. The error is the server's own text, in the normal ink: the badge already carries the status colour.
 */
export function RunItem({ run }: { run: JobRun }) {
  const summary = summarizeResult(run.result);
  const duration = runDurationText(run);
  const counted = run.status === 'succeeded' || run.status === 'failed';
  return (
    <li className="px-3.5 py-3">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <MetaBadge meta={jobRunMeta(run.status)} />
        <span className="tabular-nums">{fmtDate(run.startedAt)}</span>
        {duration && <span className="text-xs tabular-nums text-ink3">{duration}</span>}
      </p>
      <p className="mt-1 text-xs tabular-nums text-ink3">
        {triggerText(run)}
        {counted && ` · ${num(run.processed)} processed`}
      </p>
      {run.error && <p className="mt-1 break-words text-sm">{run.error}</p>}
      {summary && <p className="mt-1 text-xs tabular-nums text-ink3">{summary}</p>}
    </li>
  );
}
