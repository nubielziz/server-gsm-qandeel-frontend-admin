// Reads of the Queues & jobs tab: the queue counters (also the "Oldest queued job" KPI cell), the failed jobs of one
// queue, the scheduled jobs with one job's history, and webhook delivery.
import { getJobs, getQueues, getWebhooksHealth, listFailedJobs } from '../api';
import type { JobsQuery } from '../types';
import { FIRST_PAGE, healthKey, POLL, sameParam, type HealthPage } from './keys';
import { useHealthQuery } from './useHealthQuery';

/** The counters of every queue. It polls fast: a stuck queue is the first sign of trouble. */
export function useQueues(enabled = true) {
  return useHealthQuery({ key: healthKey('queues'), read: getQueues, poll: POLL.fast, enabled });
}

/**
 * One page of the failed jobs of `queue`, newest first. Without a queue (none picked in `?queue=`) it stays disabled
 * and reads nothing. A new page of the same queue keeps the previous answer on screen while it loads; another queue
 * does not, so one queue's failures never show under another queue's name.
 */
export function useFailedJobs(queue?: string, page: HealthPage = FIRST_PAGE, enabled = true) {
  return useHealthQuery({
    key: healthKey('failed-jobs', queue ?? null, page.start, page.end),
    read: (init) => {
      // Unreachable: the query is disabled without a queue. It keeps the type narrow.
      if (!queue) throw new Error('useFailedJobs needs a queue');
      return listFailedJobs(
        queue,
        { start: page.start, end: page.end, sort: ['failedAt'], order: ['desc'] },
        init,
      );
    },
    poll: POLL.normal,
    enabled: enabled && Boolean(queue),
    keepPrevious: (previousKey) => sameParam(previousKey, 0, queue ?? null),
  });
}

/**
 * The scheduled jobs; with `query.job` it also returns the run history of that job (the History drawer). The history
 * of one job never stays on screen while another job's loads. While the server says a job or a run is working (a
 * manual Run now), it reads every few seconds, like the integrity report, so the end of the run shows soon.
 */
export function useJobs(query: JobsQuery = {}, enabled = true) {
  return useHealthQuery({
    key: healthKey('jobs', query.job ?? null),
    read: (init) => getJobs(query, init),
    // Optional chaining on the lists too: a malformed answer must never stop the polling.
    poll: (data) =>
      data?.jobs?.some((job) => job.running) || data?.runs?.some((run) => run.status === 'running')
        ? POLL.running
        : POLL.normal,
    enabled,
    keepPrevious: () => false,
  });
}

/** Delivery health of outgoing and incoming webhooks. */
export function useWebhooksHealth(enabled = true) {
  return useHealthQuery({ key: healthKey('webhooks'), read: getWebhooksHealth, poll: POLL.normal, enabled });
}
