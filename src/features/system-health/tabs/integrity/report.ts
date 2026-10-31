// Pure helpers of the Integrity tab (route group health, GET /admin/system/integrity): put the checks that need a look first,
// name the failing ones, and say how the last run ended. They sort and sum up the states the server sent; they never judge a number.
import { integrityMeta, jobRunMeta, sortProblemsFirst, type HealthStatus, type StatusMeta } from '../../lib';
import type { IntegrityCheck, IntegrityReport, IntegrityStatus, JobRun } from '../../types';

// A check result on the page's problem scale (lib/status.ts), so the order matches the other tabs: failed, unknown, passed.
const SCALE: Record<IntegrityStatus, HealthStatus> = { pass: 'ok', fail: 'crit', unknown: 'unknown' };

/** A result the console does not know (the contract is assumed) ranks as unknown, never as a pass. */
function scaleOf(status: IntegrityStatus): HealthStatus {
  return Object.hasOwn(SCALE, status) ? SCALE[status] : 'unknown';
}

/** The checks with the failed ones first, then the unknown ones, then the passed ones. The server's order holds inside a group. */
export function orderChecks(checks: readonly IntegrityCheck[]): IntegrityCheck[] {
  return sortProblemsFirst(checks, (check) => scaleOf(check.status));
}

/** Problems first: what needs a look (everything that is not a pass, failed ones first), and the checks that passed. */
export function splitChecks(checks: readonly IntegrityCheck[]): {
  problems: IntegrityCheck[];
  passing: IntegrityCheck[];
} {
  const ordered = orderChecks(checks);
  return {
    problems: ordered.filter((check) => check.status !== 'pass'),
    passing: ordered.filter((check) => check.status === 'pass'),
  };
}

/** The checks the server marked as failed. The findings card lists what these found. */
export function failingChecks(checks: readonly IntegrityCheck[]): IntegrityCheck[] {
  return checks.filter((check) => check.status === 'fail');
}

/** True when the check gave a result (pass or fail), so its count and difference mean something. Unknown does not. */
export function wasChecked(check: Pick<IntegrityCheck, 'status'>): boolean {
  return check.status === 'pass' || check.status === 'fail';
}

/**
 * The worst result of a group of checks. The report has no overall result of its own, so this sums up the states the
 * server sent: one fail is a fail, an empty group or a check that is not a pass makes it unknown, all passed is a pass.
 */
export function rollUp(checks: readonly IntegrityCheck[]): IntegrityStatus {
  if (checks.length === 0) return 'unknown';
  if (checks.some((check) => check.status === 'fail')) return 'fail';
  return checks.every((check) => check.status === 'pass') ? 'pass' : 'unknown';
}

/** The last run that ended. A run that is still going is not a result yet. */
export function finishedRun(report: Pick<IntegrityReport, 'lastRun'>): JobRun | null {
  const run = report.lastRun;
  return run && run.status !== 'running' ? run : null;
}

/**
 * The badge of the last run. A run that finished reports its checks, so the badge is the worst of them. A run that
 * failed or was skipped never looked at the ledger, so it says that instead; no run at all, or a state the console does
 * not know, is "Not checked" in neutral. Nothing without a result is shown as a pass.
 */
export function lastRunMeta(report: Pick<IntegrityReport, 'lastRun' | 'checks'>): StatusMeta {
  const run = finishedRun(report);
  if (run?.status === 'succeeded') return integrityMeta(rollUp(report.checks));
  if (run?.status === 'failed' || run?.status === 'skipped') return jobRunMeta(run.status);
  return integrityMeta('unknown');
}

/**
 * When the run that is going now started, or null when that is not known. The server may name the running run in
 * `lastRun`; if it does not, the run this staff member just started counts, as long as it is newer than the last run
 * that ended (an older one has finished since).
 */
export function runningSince(
  report: Pick<IntegrityReport, 'running' | 'lastRun'>,
  started: Pick<JobRun, 'startedAt'> | null,
): string | null {
  if (!report.running) return null;
  if (report.lastRun?.status === 'running' && report.lastRun.startedAt) return report.lastRun.startedAt;
  const own = started?.startedAt ?? null;
  if (!own) return null;
  const last = finishedRun(report)?.startedAt;
  return last && Date.parse(last) >= Date.parse(own) ? null : own;
}
