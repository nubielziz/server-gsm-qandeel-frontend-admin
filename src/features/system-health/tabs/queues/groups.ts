// Grouping for the Queues & jobs tab (route group `health`): what needs a look comes first, healthy rows fold away.
// It only orders and splits by what the server sent (`state`, `paused`); it never decides a status.
import { sortProblemsFirst, type HealthStatus } from '../../lib';
import type { QueueStats, ScheduledJob } from '../../types';

/** A list split in two: the rows to look at (worst first) and the rest, in the server's order. */
export interface Groups<T> {
  attention: T[];
  calm: T[];
}

function split<T>(
  items: readonly T[],
  status: (item: T) => HealthStatus,
  needsLook: (item: T) => boolean,
): Groups<T> {
  const sorted = sortProblemsFirst(items, status);
  return { attention: sorted.filter(needsLook), calm: sorted.filter((item) => !needsLook(item)) };
}

/** A queue needs a look when the server's state is not ok, or when it is paused (a switch somebody turned). */
export function queueNeedsAttention(queue: Pick<QueueStats, 'state' | 'paused'>): boolean {
  return queue.state !== 'ok' || queue.paused;
}

/**
 * Queues with the worst server state first. A paused queue that the server still calls ok sorts after the queues in a
 * worse state but before the quiet ones, so a pause somebody forgot is not buried.
 */
export function groupQueues(queues: readonly QueueStats[]): Groups<QueueStats> {
  return split(
    queues,
    (queue) => (queue.paused && queue.state === 'ok' ? 'paused' : queue.state),
    queueNeedsAttention,
  );
}

/** Jobs with the worst server state first. A job that never ran is `unknown`, so it shows with the problems. */
export function groupJobs(jobs: readonly ScheduledJob[]): Groups<ScheduledJob> {
  return split(
    jobs,
    (job) => job.state,
    (job) => job.state !== 'ok',
  );
}
