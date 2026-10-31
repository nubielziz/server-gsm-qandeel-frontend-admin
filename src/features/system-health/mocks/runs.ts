// Job runs started by hand (`POST /admin/system/jobs/:name/run`, `POST /admin/system/integrity/run`). A run starts as
// `running` and ends a few seconds later; there is no timer, the next read settles every run whose time has come.
import type { JobRun, StaffRef } from '../types';
import { iso } from './clock';
import { reversingEntryPosted } from './ledgerLink';
import { lastCleanRun, seedChecks } from './seedIntegrity';
import { resultOf } from './seedOps';
import { JOBS } from './specs';
import type { HealthState } from './state';

/** How long a manual run works. Short under Vitest so a test can wait for it. */
export const RUN_MS = import.meta.env.MODE === 'test' ? 250 : 3500;

/** The run of a job that is working now, if any. */
export function runningRun(state: HealthState, job: string): JobRun | undefined {
  return state.runs.list().find((run) => run.job === job && run.status === 'running');
}

/**
 * Records a manual run that ends `RUN_MS` from now. An integrity run looks at the ledger as it is when it starts: if
 * Finance has put the wallet right by then, it will find no difference.
 */
export async function startRun(
  state: HealthState,
  job: string,
  by: StaffRef | null,
  now: number,
): Promise<JobRun> {
  const fixed = job === 'ledger_integrity' && (await reversingEntryPosted(state));
  const run = state.runs.insert({
    job,
    startedAt: iso(now),
    finishedAt: null,
    durationMs: 0,
    processed: 0,
    trigger: 'manual',
    status: 'running',
    error: null,
    result: null,
    triggeredBy: by,
  });
  state.pending.set(run.id, { at: now + RUN_MS, fixed });
  return run;
}

// Ends one run: it succeeded. An integrity run also renews the four checks: they still fail unless a reversing entry was
// posted in Finance, and then the mismatch alert closes by itself, as the server does when the value is back in range.
function finish(state: HealthState, id: number, at: number, fixed: boolean): void {
  const run = state.runs.find(id);
  const spec = JOBS.find((candidate) => candidate.name === run?.job);
  if (!run || !spec) return;
  if (run.job === 'ledger_integrity') {
    state.checks = seedChecks(state.profile.ledgerMismatch && !fixed, state.anchor);
    if (fixed) closeMismatchAlerts(state, at);
  }
  const failed = state.checks.filter((check) => check.status === 'fail').length;
  state.runs.patch(id, {
    status: 'succeeded',
    finishedAt: iso(at),
    durationMs: at - Date.parse(run.startedAt ?? iso(at)),
    processed: spec.processed,
    result: resultOf(run.job, spec.processed, failed),
  });
  if (run.job === 'ledger_integrity')
    state.lastSuccessAt = lastCleanRun(state.runs.list())?.finishedAt ?? null;
}

// The server closes an alert when the value is back in range; the next integrity run is when that is seen.
function closeMismatchAlerts(state: HealthState, at: number): void {
  for (const alert of state.alerts.list()) {
    if (alert.rule.key === 'ledger_mismatch' && alert.status !== 'resolved') {
      state.alerts.patch(alert.id, { status: 'resolved', resolvedAt: iso(at) });
    }
  }
}

/** Ends the runs whose time has come. Call it at the top of every read that shows runs. */
export function settleRuns(state: HealthState, now: number): void {
  for (const [id, { at, fixed }] of state.pending) {
    if (at > now) continue;
    state.pending.delete(id);
    finish(state, id, at, fixed);
  }
}
