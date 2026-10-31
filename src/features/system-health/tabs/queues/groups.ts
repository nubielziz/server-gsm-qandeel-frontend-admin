// Grouping for the Queues & jobs tab (route group `health`): what needs a look comes first, healthy rows fold away.
// It only orders and splits by what the server sent (`state`, `paused`); it never decides a status.
import { sortProblemsFirst, type HealthStatus } from '../../lib';
import type { QueueStats, ScheduledJob, WebhookDirectionHealth } from '../../types';
import type { WebhookRow } from './webhooks';

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

/** A webhook direction needs a look when either number the server judges (success rate, oldest message) is not ok. */
export function webhookNeedsAttention(
  health: Pick<WebhookDirectionHealth, 'successRate' | 'oldestAge'>,
): boolean {
  return health.successRate.state !== 'ok' || health.oldestAge.state !== 'ok';
}

/**
 * Splits the rows of `webhookRows`, which are already worst first: the directions to look at, and the quiet rest. A
 * state the console does not know, or a missing reading ("unknown"), is a reason to look, never "healthy".
 */
export function groupWebhooks(rows: readonly WebhookRow[]): Groups<WebhookRow> {
  const needsLook = (row: WebhookRow) => webhookNeedsAttention(row.health);
  return { attention: rows.filter(needsLook), calm: rows.filter((row) => !needsLook(row)) };
}
