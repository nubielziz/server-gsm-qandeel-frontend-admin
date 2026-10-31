// BullMQ queues for the Queues & jobs tab: the counters, the failed jobs of one queue, and the two actions on a queue
// (retry, pause). Routes `/admin/system/queues*`. Assumed contracts (the map gives no bodies).
import { apiGet, apiList, apiPost, pathOf, type ApiInit, type ListQuery, type ListResult } from '@/lib/api';
import type {
  FailedJob,
  PauseQueueBody,
  QueuesResponse,
  QueueStats,
  RetryQueueBody,
  RetryQueueResult,
} from '../types';

/**
 * The counters of every queue (waiting, active, delayed, failed, age of the oldest job, rate, workers) and the oldest
 * waiting job of all. Deep detail stays in Bull Board, which the page links to when it is configured.
 * Assumed contract: answer `QueuesResponse`; no query.
 * @route GET /admin/system/queues
 */
export function getQueues(init?: ApiInit): Promise<QueuesResponse> {
  return apiGet<QueuesResponse>('/admin/system/queues', undefined, init);
}

/**
 * One page of the failed jobs of a queue, newest failure first, with the reason and the attempts. The total comes in
 * `x-total-count`, so the tab can page through a long list.
 * Assumed contract: simple-rest range and sort (`_start`, `_end`, `_sort`, `_order`; the hook asks for `failedAt`, newest
 * first); each row is a `FailedJob`.
 * @route GET /admin/system/queues/:name/failed
 */
export function listFailedJobs(
  queue: string,
  query: ListQuery = {},
  init?: ApiInit,
): Promise<ListResult<FailedJob>> {
  return apiList<FailedJob>(
    pathOf('/admin/system/queues/:name/failed', { name: queue }),
    query,
    undefined,
    init,
  );
}

/**
 * Sends one failed job, or every failed job of the queue, back to waiting. The server writes the audit log entry.
 * Assumed contract: body `RetryQueueBody` (`{ jobId }` or `{ all: true }`); answer `RetryQueueResult` with the number
 * of jobs that went back to waiting.
 * @route POST /admin/system/queues/:name/retry
 */
export function retryQueue(queue: string, body: RetryQueueBody, init?: ApiInit): Promise<RetryQueueResult> {
  return apiPost<RetryQueueResult>(pathOf('/admin/system/queues/:name/retry', { name: queue }), body, init);
}

/**
 * Pauses a queue during an incident (workers stop taking jobs, waiting jobs stay queued) or resumes it. The reason
 * goes to the audit log; the server asks for it when pausing.
 * Assumed contract: body `PauseQueueBody` (`{ paused, reason? }`); answer the queue's counters after the change
 * (`QueueStats`). The console does not read the answer: it reads the queues again.
 * @route POST /admin/system/queues/:name/pause
 */
export function pauseQueue(queue: string, body: PauseQueueBody, init?: ApiInit): Promise<QueueStats> {
  return apiPost<QueueStats>(pathOf('/admin/system/queues/:name/pause', { name: queue }), body, init);
}
