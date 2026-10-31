// The answers about background work: `GET /admin/system/queues` (BullMQ counters, with pause and retry applied),
// `GET /admin/system/jobs` (schedules and run history) and `GET /admin/system/webhooks` (delivery health).
import type {
  JobRun,
  JobsResponse,
  MetricState,
  QueueStats,
  QueuesResponse,
  ScheduledJob,
  WebhookDirectionHealth,
  WebhooksHealth,
} from '../types';
import { SECOND, bucketStarts, iso, round, stepOf } from './clock';
import { onsetOf } from './profile';
import { lastScheduled } from './seedOps';
import { atBucket, nowOf, sample, type Signal } from './signal';
import { JOBS, QUEUES, QUEUE_STRESS, type QueueSpec } from './specs';
import type { HealthState } from './state';
import { SPEC, measure, worst } from './thresholds';

/** How long jobs that a retry put back to waiting stay counted, before a worker would have taken them. */
const RETRY_VISIBLE_MS = 6 * SECOND;

type Numbers = Omit<QueueSpec, 'name'>;
const FIELDS = ['waiting', 'active', 'delayed', 'rate', 'age'] as const;

// A queue's calm numbers, and the ones the scenario's trouble drives them to.
function targetOf(state: HealthState, spec: QueueSpec): Numbers {
  const table = state.profile.dbDown
    ? QUEUE_STRESS.outage
    : state.profile.slowSupplier
      ? QUEUE_STRESS.degraded
      : undefined;
  return { ...spec, ...table?.[spec.name] };
}

function signalsOf(state: HealthState, spec: QueueSpec): Record<(typeof FIELDS)[number], Signal> {
  const target = targetOf(state, spec);
  const since = onsetOf(state.profile, state.anchor);
  return Object.fromEntries(
    FIELDS.map((field) => [
      field,
      {
        name: `queue:${spec.name}:${field}`,
        calm: spec[field],
        day: 'flat',
        noise: 0.12,
        stressed: target[field] === spec[field] ? undefined : target[field],
        since,
      } satisfies Signal,
    ]),
  ) as Record<(typeof FIELDS)[number], Signal>;
}

// The server's verdict on a queue's failed jobs: a handful is normal, dozens are not.
const failedState = (failed: number): MetricState => (failed >= 50 ? 'crit' : failed >= 10 ? 'warn' : 'ok');

/** The counters of one queue now: the seeded level, plus what a pause or a retry just did. */
export function queueStats(state: HealthState, spec: QueueSpec, now: number): QueueStats {
  const signals = signalsOf(state, spec);
  const runtime = state.queues.get(spec.name);
  const target = targetOf(state, spec);
  const failed = state.failed.get(spec.name)?.length ?? 0;
  let waiting = round(nowOf(signals.waiting, now));
  let active = round(nowOf(signals.active, now));
  let rate = nowOf(signals.rate, now);
  let age = nowOf(signals.age, now);
  if (runtime?.paused && runtime.pausedAt !== null) {
    // Nobody takes jobs: they pile up and the oldest one keeps getting older.
    const seconds = (now - runtime.pausedAt) / SECOND;
    waiting += Math.floor((seconds * target.rate) / 60);
    active = 0;
    rate = 0;
    age += seconds;
  }
  waiting += (runtime?.retries ?? [])
    .filter((retry) => now - retry.at < RETRY_VISIBLE_MS)
    .reduce((sum, retry) => sum + retry.count, 0);
  const oldestAge = measure(SPEC.queueAge, age);
  return {
    name: spec.name,
    state: worst([
      oldestAge.state,
      failedState(failed),
      runtime?.paused ? 'warn' : 'ok',
      target.workers === 0 ? 'crit' : 'ok',
    ]),
    paused: runtime?.paused ?? false,
    waiting,
    active,
    delayed: round(nowOf(signals.delayed, now)),
    failed,
    oldestAge,
    ratePerMin: measure(SPEC.queueRate, rate),
    workers: target.workers,
  };
}

/** `GET /admin/system/queues`. */
export function buildQueues(state: HealthState, now: number): QueuesResponse {
  const queues = QUEUES.map((spec) => queueStats(state, spec, now));
  const step = stepOf('metrics', '24h');
  const ages = QUEUES.map((spec) => signalsOf(state, spec).age);
  const oldest = Math.max(...queues.map((queue) => queue.oldestAge.value ?? 0));
  return {
    queues,
    oldestAge: measure(SPEC.queueAge, oldest),
    trend: bucketStarts('24h', step, now).map((at) => ({
      at: iso(at),
      value: round(Math.max(...ages.map((signal) => sample(signal, atBucket(at, step, now), step)))),
    })),
  };
}

// ---- Scheduled jobs ----

const byNewest = (a: JobRun, b: JobRun): number =>
  Date.parse(b.startedAt ?? '') - Date.parse(a.startedAt ?? '');

// The server's verdict on a job from how its last run ended.
function jobState(lastRun: JobRun | null): MetricState {
  if (!lastRun) return 'unknown';
  return lastRun.status === 'failed' ? 'crit' : lastRun.status === 'skipped' ? 'warn' : 'ok';
}

/** `GET /admin/system/jobs`. With `job`, the run history of that job (newest first) comes too. */
export function buildJobs(state: HealthState, job: string | undefined, now: number): JobsResponse {
  const all = state.runs.list().sort(byNewest);
  const jobs = JOBS.map((spec): ScheduledJob => {
    const own = all.filter((run) => run.job === spec.name);
    const lastRun = own.find((run) => run.status !== 'running') ?? null;
    return {
      name: spec.name,
      label: spec.label,
      schedule: spec.schedule,
      scheduleText: spec.text,
      state: jobState(lastRun),
      running: own.some((run) => run.status === 'running'),
      lastRun,
      nextRunAt: iso(lastScheduled(spec, now) + spec.every),
    };
  });
  return { jobs, runs: job ? all.filter((run) => run.job === job).slice(0, 50) : [] };
}

// ---- Webhooks ----

type Direction = { delivered: number; failed: number; retrying: number; oldestSeconds: number | null };

const WEBHOOKS: Record<'calm' | 'slow' | 'outage', { outgoing: Direction; incoming: Direction }> = {
  calm: {
    outgoing: { delivered: 3214, failed: 41, retrying: 5, oldestSeconds: 40 },
    incoming: { delivered: 884, failed: 2, retrying: 0, oldestSeconds: null },
  },
  // Merchants' endpoints time out while their orders are late.
  slow: {
    outgoing: { delivered: 2985, failed: 118, retrying: 38, oldestSeconds: 360 },
    incoming: { delivered: 871, failed: 3, retrying: 0, oldestSeconds: null },
  },
  // The gateways' callbacks hit a service that cannot reach its database.
  outage: {
    outgoing: { delivered: 2410, failed: 96, retrying: 540, oldestSeconds: 840 },
    incoming: { delivered: 612, failed: 312, retrying: 0, oldestSeconds: 840 },
  },
};

function directionOf(state: HealthState, facts: Direction, now: number): WebhookDirectionHealth {
  const oldestAt = facts.oldestSeconds === null ? null : state.anchor - facts.oldestSeconds * SECOND;
  const total = facts.delivered + facts.failed;
  return {
    successRate: measure(SPEC.webhookSuccess, total === 0 ? null : (facts.delivered / total) * 100),
    delivered: facts.delivered,
    failed: facts.failed,
    retrying: facts.retrying,
    oldestUndeliveredAt: oldestAt === null ? null : iso(oldestAt),
    oldestAge: measure(SPEC.webhookAge, oldestAt === null ? 0 : (now - oldestAt) / SECOND),
  };
}

/** `GET /admin/system/webhooks`. */
export function buildWebhooks(state: HealthState, now: number): WebhooksHealth {
  const story = state.profile.dbDown ? 'outage' : state.profile.slowSupplier ? 'slow' : 'calm';
  const facts = WEBHOOKS[story];
  return {
    outgoing: directionOf(state, facts.outgoing, now),
    incoming: directionOf(state, facts.incoming, now),
  };
}
