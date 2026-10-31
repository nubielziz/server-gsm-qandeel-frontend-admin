// Seed of the background work of the System health mock: the queues' switches, their failed jobs and the run history of
// the scheduled jobs (what the scenario made of them). Times are relative to the moment the state was seeded.
import type { FailedJob, JobRun } from '../types';
import { HOUR, MINUTE, iso, pick, wobble } from './clock';
import type { Profile } from './profile';
import { FAILED_COUNTS, FAILURES, JOBS, QUEUES, STAFF, type JobSpec } from './specs';
import type { QueueRuntime } from './state';

/** Which part of the story the failed jobs and runs belong to. */
export type Story = 'calm' | 'slow' | 'outage' | 'ledger';

export function storyOf(profile: Profile): Story {
  if (profile.dbDown) return 'outage';
  if (profile.slowSupplier) return 'slow';
  return profile.ledgerMismatch ? 'ledger' : 'calm';
}

/** Every queue starts running. */
export function seedQueues(): Map<string, QueueRuntime> {
  return new Map(QUEUES.map((q) => [q.name, { name: q.name, paused: false, pausedAt: null, retries: [] }]));
}

const JOB_NAMES: Record<string, string> = {
  'orders.dispatch': 'dispatch-order',
  'orders.fetch': 'fetch-order-status',
  'supplier.sync': 'sync-prices',
  notifications: 'send-notification',
  'webhooks.out': 'deliver-webhook',
  'ledger.jobs': 'post-entry',
  'risk.assess': 'assess-order',
  'reports.export': 'export-report',
};
const MAX_ATTEMPTS: Record<string, number> = { 'orders.dispatch': 5, 'orders.fetch': 8, 'webhooks.out': 6 };

/** The failed jobs of every queue, newest first. A job id grows with time, as BullMQ's do. */
export function seedFailed(profile: Profile, anchor: number): Map<string, FailedJob[]> {
  const story = storyOf(profile);
  const counts = FAILED_COUNTS[story];
  const texts = FAILURES[story === 'ledger' ? 'calm' : story];
  // The failures of a trouble are recent; the calm ones are spread over a day and a half.
  const window =
    story === 'calm' || story === 'ledger' ? 36 * HOUR : story === 'slow' ? 38 * MINUTE : 14 * MINUTE;
  const failed = new Map<string, FailedJob[]>();
  for (const queue of QUEUES) {
    const count = counts[queue.name] ?? 0;
    const text = texts[queue.name]?.[0] ?? { reason: 'Job failed', subject: 'job #' };
    const maxAttempts = MAX_ATTEMPTS[queue.name] ?? 3;
    failed.set(
      queue.name,
      Array.from({ length: count }, (_, i) => ({
        id: String(48_000 + (count - i) * 7 + pick(`${queue.name}:id`, 0, 5, i)),
        name: JOB_NAMES[queue.name] ?? 'job',
        failedReason: text.reason,
        attemptsMade: maxAttempts,
        maxAttempts,
        failedAt: iso(anchor - Math.round(((i + 0.5) / count) * window)),
        subject: `${text.subject}${10_400 + pick(`${queue.name}:subject`, 0, 900, i)}`,
      })),
    );
  }
  return failed;
}

/** The last time a job was due at or before `at`. */
export function lastScheduled(spec: JobSpec, at: number): number {
  return Math.floor((at - spec.offset) / spec.every) * spec.every + spec.offset;
}

/** The summary a run of a job leaves in `job_runs.result`. */
export function resultOf(job: string, processed: number, failedChecks = 0): JobRun['result'] {
  switch (job) {
    case 'price_sync':
      return { suppliers: 6, prices: processed, changed: Math.round(processed * 0.03) };
    case 'supplier_balance':
      return { suppliers: processed, lowBalance: 1 };
    case 'reminders':
      return { sent: processed };
    case 'fx_refresh':
      return { currencies: processed, updated: processed };
    case 'accruals':
      return { accruals: processed, clients: 18 };
    case 'ledger_integrity':
      return {
        entriesChecked: processed,
        accountsChecked: 312,
        holdsChecked: 27,
        paymentsChecked: 1184,
        failedChecks,
      };
    default:
      return { imeiRecordsDeleted: processed, sessionsDeleted: Math.round(processed / 3) };
  }
}

// The old runs that did not go well, so the history is not a wall of green: [job, how many runs ago, status, text].
const BLIPS: [string, number, 'failed' | 'skipped', string][] = [
  ['price_sync', 7, 'failed', 'Rapid IMEI: HTTP 502 Bad Gateway'],
  ['fx_refresh', 9, 'failed', 'Rates provider answered 503'],
  ['reminders', 11, 'skipped', 'The previous run was still working'],
];

function scheduledRun(spec: JobSpec, ago: number, anchor: number): Omit<JobRun, 'id'> {
  const due = lastScheduled(spec, anchor) - ago * spec.every;
  const startedAt = due + pick(`${spec.name}:delay`, 200, 4000, ago);
  const blip = BLIPS.find(([job, runsAgo]) => job === spec.name && runsAgo === ago);
  const skipped = blip?.[2] === 'skipped';
  const duration = skipped ? 0 : Math.round(spec.typical * (1 + 0.2 * wobble(`${spec.name}:duration`, ago)));
  const processed = skipped ? 0 : Math.round(spec.processed * (1 + 0.05 * wobble(`${spec.name}:count`, ago)));
  return {
    job: spec.name,
    startedAt: iso(startedAt),
    finishedAt: iso(startedAt + duration),
    durationMs: duration,
    processed,
    trigger: 'schedule',
    status: blip?.[2] ?? 'succeeded',
    error: blip?.[3] ?? null,
    result: blip ? null : resultOf(spec.name, processed),
    triggeredBy: null,
  };
}

const failedWith = (run: Omit<JobRun, 'id'>, error: string, processed = 0): Omit<JobRun, 'id'> => ({
  ...run,
  status: 'failed',
  error,
  processed,
  result: null,
});

/** Twenty runs per job, oldest first (so ids grow with time); the scenario spoils the newest of some. */
export function seedRuns(profile: Profile, anchor: number): Omit<JobRun, 'id'>[] {
  const all: Omit<JobRun, 'id'>[] = [];
  for (const spec of JOBS) {
    // Newest first; a run that would still be working at the anchor is left out.
    const runs = Array.from({ length: 20 }, (_, ago) => scheduledRun(spec, ago, anchor)).filter(
      (run) => Date.parse(run.finishedAt ?? run.startedAt ?? '') <= anchor,
    );
    if (profile.slowSupplier && spec.name === 'price_sync') {
      runs[0] = failedWith(runs[0], 'Rapid IMEI: timeout after 6000 ms', 1102);
    }
    if (profile.dbDown && ['price_sync', 'supplier_balance', 'reminders', 'fx_refresh'].includes(spec.name)) {
      runs[0] = failedWith(runs[0], 'connect ECONNREFUSED 10.0.3.12:5432');
    }
    if (profile.ledgerMismatch && spec.name === 'ledger_integrity') {
      // A finance run an hour ago found the difference; scheduled runs after it would have found it too.
      const startedAt = anchor - 44 * MINUTE;
      const manual: Omit<JobRun, 'id'> = {
        job: spec.name,
        startedAt: iso(startedAt),
        finishedAt: iso(startedAt + 15_200),
        durationMs: 15_200,
        processed: spec.processed,
        trigger: 'manual',
        status: 'succeeded',
        error: null,
        result: resultOf(spec.name, spec.processed, 1),
        triggeredBy: STAFF.dana,
      };
      all.push(manual, ...runs.filter((run) => Date.parse(run.startedAt ?? '') < startedAt));
      continue;
    }
    all.push(...runs);
  }
  return all.sort((a, b) => Date.parse(a.startedAt ?? '') - Date.parse(b.startedAt ?? ''));
}
