// Background work: BullMQ queues and their failed jobs, scheduled jobs and their runs (`job_runs`), and webhook
// delivery. Routes `/admin/system/queues*`, `/admin/system/jobs*`, `/admin/system/webhooks`. Assumed contract.
import type { IsoDateTime, JsonObject } from '@/lib/api';
import type { JobRunRow } from '@/lib/api/schema.gen';
import type { Measure, MetricState, SeriesPoint, StaffRef } from './common';

/** Counters of one BullMQ queue. `state` is the server's verdict for the queue as a whole. */
export interface QueueStats {
  name: string;
  state: MetricState;
  paused: boolean;
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  /** Age of the oldest waiting job, in seconds. */
  oldestAge: Measure;
  /** Jobs finished per minute. */
  ratePerMin: Measure;
  workers: number;
}

/** Answer of `GET /admin/system/queues`: every queue, the oldest waiting job of all, and its last 24 hours. */
export interface QueuesResponse {
  queues: QueueStats[];
  oldestAge: Measure;
  trend: SeriesPoint[];
}

/** One failed job of a queue (`GET /admin/system/queues/:name/failed`, a simple-rest list). */
export interface FailedJob {
  /** BullMQ job id (a string). */
  id: string;
  name: string;
  failedReason: string;
  attemptsMade: number;
  maxAttempts: number;
  failedAt: IsoDateTime;
  /** What the job was about ("order #10422"), when the server knows. */
  subject: string | null;
}

/** Body of `POST /admin/system/queues/:name/retry`: one job, or every failed job of the queue. */
export type RetryQueueBody = { jobId: string } | { all: true };

/** Answer of the retry: how many jobs went back to waiting. */
export interface RetryQueueResult {
  retried: number;
}

/** Body of `POST /admin/system/queues/:name/pause`: pause with a reason (for the audit log), or resume. */
export interface PauseQueueBody {
  paused: boolean;
  reason?: string;
}

/** Why a job ran: its schedule, a staff member (`manual`), or an event. */
export type JobTrigger = 'schedule' | 'manual' | 'event';

/** How a run ended, or `running`. */
export type JobRunStatus = 'running' | 'succeeded' | 'failed' | 'skipped';

/** One run of a scheduled or background job (`job_runs`). `result` holds the job's own summary. */
export interface JobRun extends Pick<
  JobRunRow,
  'id' | 'job' | 'startedAt' | 'finishedAt' | 'durationMs' | 'processed'
> {
  trigger: JobTrigger;
  status: JobRunStatus;
  error: string | null;
  result: JsonObject | null;
  triggeredBy: StaffRef | null;
}

/** One scheduled job: its schedule, last and next run, and the server's verdict on it. */
export interface ScheduledJob {
  name: string;
  label: string;
  /** Cron expression, shown in mono. */
  schedule: string;
  /** The schedule in words ("Every 15 minutes"). */
  scheduleText: string;
  state: MetricState;
  running: boolean;
  lastRun: JobRun | null;
  nextRunAt: IsoDateTime | null;
}

/** Query of `GET /admin/system/jobs`: `job` asks for that job's run history too. */
export interface JobsQuery {
  job?: string;
}

/** Answer of `GET /admin/system/jobs`. `runs` is empty unless `?job=` was sent. */
export interface JobsResponse {
  jobs: ScheduledJob[];
  runs: JobRun[];
}

/** Delivery health of one direction of webhooks over the last 24 hours. */
export interface WebhookDirectionHealth {
  successRate: Measure;
  delivered: number;
  failed: number;
  retrying: number;
  oldestUndeliveredAt: IsoDateTime | null;
  /** Age of the oldest message not delivered yet, in seconds. */
  oldestAge: Measure;
}

/** Answer of `GET /admin/system/webhooks`: outgoing to merchants, incoming from payment gateways. */
export interface WebhooksHealth {
  outgoing: WebhookDirectionHealth;
  incoming: WebhookDirectionHealth;
}
