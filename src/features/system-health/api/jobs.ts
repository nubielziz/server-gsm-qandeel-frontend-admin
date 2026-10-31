// Scheduled jobs and webhook delivery for the Queues & jobs tab: `GET /admin/system/jobs`, its manual run
// (`/admin/system/jobs/:name/run`) and `GET /admin/system/webhooks`. Assumed contracts (the map gives no bodies).
import { apiGet, apiPost, pathOf, type ApiInit } from '@/lib/api';
import type { JobRun, JobsQuery, JobsResponse, WebhooksHealth } from '../types';

/**
 * The scheduled jobs with their schedule, last run, next run and the server's verdict. With a job name it also returns
 * the run history of that job, which the History drawer shows.
 * Assumed contract: optional query `job` (a job `name`); answer `JobsResponse` with `runs` empty unless `job` was sent.
 * @route GET /admin/system/jobs
 */
export function getJobs(query: JobsQuery = {}, init?: ApiInit): Promise<JobsResponse> {
  return apiGet<JobsResponse>('/admin/system/jobs', { job: query.job }, init);
}

/**
 * Runs a scheduled job now, outside its schedule (for example the price sync). The server records the run with the
 * trigger `manual` and writes the audit log entry.
 * Assumed contract: no body; answer the run just started (`JobRun`, status `running`). The console does not read the
 * answer: it reads the jobs again.
 * @route POST /admin/system/jobs/:name/run
 */
export function runJob(job: string, init?: ApiInit): Promise<JobRun> {
  return apiPost<JobRun>(pathOf('/admin/system/jobs/:name/run', { name: job }), undefined, init);
}

/**
 * Delivery health of outgoing webhooks to merchants and incoming ones from payment gateways: success rate, failures,
 * retries and the oldest message not delivered yet. A stuck webhook is a merchant that never hears about an order.
 * Assumed contract: answer `WebhooksHealth`; no query.
 * @route GET /admin/system/webhooks
 */
export function getWebhooksHealth(init?: ApiInit): Promise<WebhooksHealth> {
  return apiGet<WebhooksHealth>('/admin/system/webhooks', undefined, init);
}
