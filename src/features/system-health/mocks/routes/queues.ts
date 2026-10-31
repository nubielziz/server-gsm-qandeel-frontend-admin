// Mock routes of the background work: `GET /admin/system/queues` (+ `/:name/failed`, `/:name/retry`, `/:name/pause`),
// `GET /admin/system/jobs`, `POST /admin/system/jobs/:name/run` and `GET /admin/system/webhooks`. Retry and pause change
// the counters the next read shows; a run started by hand ends a few seconds later.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { invalid, notFound, textOf } from '@/mocks/handlers/accessShared';
import { problem } from '@/mocks/problem';
import type {
  JobRun,
  JobsResponse,
  QueueStats,
  QueuesResponse,
  RetryQueueResult,
  WebhooksHealth,
} from '../../types';
import { buildJobs, buildQueues, buildWebhooks, queueStats } from '../buildQueues';
import { listAnswer, route, staffRef } from '../http';
import { runningRun, startRun } from '../runs';
import { JOBS, QUEUES } from '../specs';

export const queueRoutes: HttpHandler[] = [
  http.get(
    '*/admin/system/queues/:name/failed',
    route({}, ({ state, params, url }) => {
      const name = String(params.name);
      if (!QUEUES.some((queue) => queue.name === name)) return notFound('queue', name);
      return listAnswer(state.failed.get(name) ?? [], url, {
        search: ['name', 'failedReason', 'subject'],
        sort: 'failedAt',
        order: 'desc',
      });
    }),
  ),

  http.post(
    '*/admin/system/queues/:name/retry',
    route({ write: 'system:manage' }, async ({ state, params, body, now }) => {
      const name = String(params.name);
      const runtime = state.queues.get(name);
      if (!runtime) return notFound('queue', name);
      const input = await body();
      const failed = state.failed.get(name) ?? [];
      let retried: number;
      if (input.all === true) {
        retried = failed.length;
        state.failed.set(name, []);
      } else if (typeof input.jobId === 'string' || typeof input.jobId === 'number') {
        const index = failed.findIndex((job) => job.id === String(input.jobId));
        if (index < 0) return notFound('failed job', `${String(input.jobId)} in ${name}`);
        failed.splice(index, 1);
        retried = 1;
      } else {
        return invalid([
          { field: 'jobId', message: 'Send a job id, or all: true to retry every failed job.' },
        ]);
      }
      // The jobs go back to waiting; the counters show them there for a moment.
      if (retried > 0) runtime.retries.push({ at: now, count: retried });
      const result: RetryQueueResult = { retried };
      return HttpResponse.json<RetryQueueResult>(result);
    }),
  ),

  http.post(
    '*/admin/system/queues/:name/pause',
    route({ write: 'system:manage' }, async ({ state, params, body, now }) => {
      const name = String(params.name);
      const runtime = state.queues.get(name);
      const spec = QUEUES.find((queue) => queue.name === name);
      if (!runtime || !spec) return notFound('queue', name);
      const input = await body();
      if (typeof input.paused !== 'boolean') {
        return invalid([
          { field: 'paused', message: 'Send paused: true to pause the queue or false to resume it.' },
        ]);
      }
      // A pause is recorded in the audit log with its reason, so it is required.
      if (input.paused && textOf(input.reason).length < 3) {
        return invalid([
          { field: 'reason', message: 'Say why you are pausing this queue (at least 3 characters).' },
        ]);
      }
      if (input.paused && !runtime.paused) runtime.pausedAt = now;
      if (!input.paused) runtime.pausedAt = null;
      runtime.paused = input.paused;
      return HttpResponse.json<QueueStats>(queueStats(state, spec, now));
    }),
  ),

  http.get(
    '*/admin/system/queues',
    route({ gate: 'queues' }, ({ state, now }) => HttpResponse.json<QueuesResponse>(buildQueues(state, now))),
  ),

  http.get(
    '*/admin/system/jobs',
    route({}, ({ state, url, now }) => {
      const job = url.searchParams.get('job') ?? undefined;
      if (job && !JOBS.some((spec) => spec.name === job)) return notFound('job', job);
      return HttpResponse.json<JobsResponse>(buildJobs(state, job, now));
    }),
  ),

  http.post(
    '*/admin/system/jobs/:name/run',
    route({ write: 'system:manage' }, async ({ state, params, now }) => {
      const name = String(params.name);
      const spec = JOBS.find((job) => job.name === name);
      if (!spec) return notFound('job', name);
      if (runningRun(state, name)) {
        return problem(
          409,
          'JOB_ALREADY_RUNNING',
          'Job already running',
          `${spec.label} is running now. Wait for it to finish.`,
        );
      }
      return HttpResponse.json<JobRun>(await startRun(state, name, await staffRef(), now), { status: 202 });
    }),
  ),

  http.get(
    '*/admin/system/webhooks',
    route({}, ({ state, now }) => HttpResponse.json<WebhooksHealth>(buildWebhooks(state, now))),
  ),
];
