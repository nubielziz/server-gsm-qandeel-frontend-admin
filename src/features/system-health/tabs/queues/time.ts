// Time words of the Queues & jobs tab (route group `health`): when a job ran, when it runs next, how long it took.
// All of them print what the server sent; none decides whether a time is late.
import { ageText, dayKey, fmtDate, fmtTime } from '@/lib/format';
import { formatDuration } from '../../lib';
import type { JobRun } from '../../types';

/** "14:30" for a moment on today's date, "05 Mar, 14:30" for any other day. Empty for a missing or unreadable time. */
export function clockText(at: string | null | undefined, now: number): string {
  if (!at) return '';
  const full = fmtDate(at);
  if (full === '') return '';
  return dayKey(at) === dayKey(now) ? fmtTime(at) : full;
}

/** How far ahead a moment is: "in 12m", "in 2h 5m". Once it has come: "due now". Empty when there is no time. */
export function untilText(at: string | null | undefined, now: number): string {
  const ms = Date.parse(at ?? '') - now;
  if (!Number.isFinite(ms)) return '';
  return ms <= 0 ? 'due now' : `in ${ageText(ms)}`;
}

/** How long a run took ("21s", "3m 12s"). Empty while it is still running: it has no end yet. */
export function runDurationText(run: Pick<JobRun, 'status' | 'durationMs'>): string {
  return run.status === 'running' ? '' : formatDuration(run.durationMs / 1000);
}
