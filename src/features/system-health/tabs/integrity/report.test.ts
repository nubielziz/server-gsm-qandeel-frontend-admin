// Tests for the pure helpers of the Integrity tab: the order of the checks, the roll-up, the badge of the last run and
// when a running check started.
import { describe, expect, it } from 'vitest';
import type { IntegrityCheck, IntegrityReport, IntegrityStatus, JobRun } from '../../types';
import {
  failingChecks,
  finishedRun,
  lastRunMeta,
  orderChecks,
  rollUp,
  runningSince,
  splitChecks,
  wasChecked,
} from './report';

function check(key: IntegrityCheck['key'], status: IntegrityStatus): IntegrityCheck {
  return { key, label: key, status, count: status === 'fail' ? 1 : 0, difference: null, findings: [] };
}

function run(overrides: Partial<JobRun> = {}): JobRun {
  return {
    id: 1,
    job: 'ledger_integrity',
    startedAt: '2026-03-05T02:30:00.000Z',
    finishedAt: '2026-03-05T02:30:14.000Z',
    durationMs: 14_000,
    processed: 100,
    trigger: 'schedule',
    status: 'succeeded',
    error: null,
    result: null,
    triggeredBy: null,
    ...overrides,
  };
}

function report(overrides: Partial<IntegrityReport> = {}): IntegrityReport {
  return { running: false, lastRun: run(), lastSuccessAt: null, checks: [], ...overrides };
}

const MIXED = [
  check('entries_balanced', 'pass'),
  check('accounts_match_lines', 'fail'),
  check('stuck_holds', 'unknown'),
  check('payments_without_entry', 'pass'),
];

describe('ordering the checks', () => {
  it('puts failed checks first, then unknown ones, then passed ones, keeping the server order inside a group', () => {
    expect(orderChecks(MIXED).map((c) => c.key)).toEqual([
      'accounts_match_lines',
      'stuck_holds',
      'entries_balanced',
      'payments_without_entry',
    ]);
  });

  it('does not change the list it was given', () => {
    const before = MIXED.map((c) => c.key);
    orderChecks(MIXED);
    expect(MIXED.map((c) => c.key)).toEqual(before);
  });

  it('splits what needs a look from what passed, and a result it does not know is a problem, not a pass', () => {
    const odd = { ...check('stuck_holds', 'pass'), status: 'maybe' } as unknown as IntegrityCheck;
    const { problems, passing } = splitChecks([...MIXED, odd]);
    expect(problems.map((c) => c.key)).toEqual(['accounts_match_lines', 'stuck_holds', 'stuck_holds']);
    expect(problems[2]).toBe(odd);
    expect(passing.map((c) => c.key)).toEqual(['entries_balanced', 'payments_without_entry']);
  });

  it('names the failing checks only', () => {
    expect(failingChecks(MIXED).map((c) => c.key)).toEqual(['accounts_match_lines']);
    expect(failingChecks([check('entries_balanced', 'pass')])).toEqual([]);
  });
});

describe('wasChecked', () => {
  it('is true for a pass and a fail only, so an unknown or an unfamiliar result has no figures', () => {
    expect(wasChecked(check('entries_balanced', 'pass'))).toBe(true);
    expect(wasChecked(check('entries_balanced', 'fail'))).toBe(true);
    expect(wasChecked(check('entries_balanced', 'unknown'))).toBe(false);
    expect(wasChecked({ status: 'maybe' as IntegrityStatus })).toBe(false);
  });
});

describe('rollUp', () => {
  it('is a fail when one check failed, even if another is unknown', () => {
    expect(rollUp(MIXED)).toBe('fail');
  });

  it('is unknown with no checks or with a check that did not pass or fail', () => {
    expect(rollUp([])).toBe('unknown');
    expect(rollUp([check('entries_balanced', 'pass'), check('stuck_holds', 'unknown')])).toBe('unknown');
  });

  it('is a pass only when every check passed', () => {
    expect(rollUp([check('entries_balanced', 'pass'), check('stuck_holds', 'pass')])).toBe('pass');
  });
});

describe('the badge of the last run', () => {
  const passed = [check('entries_balanced', 'pass')];

  it('reports the worst check of a run that finished', () => {
    expect(lastRunMeta(report({ checks: passed })).word).toBe('Pass');
    expect(lastRunMeta(report({ checks: MIXED })).word).toBe('Fail');
  });

  it('says Not checked, in neutral, when there is no run or the checks are missing', () => {
    expect(lastRunMeta(report({ lastRun: null, checks: passed }))).toMatchObject({
      word: 'Not checked',
      tone: 'neutral',
    });
    expect(lastRunMeta(report({ checks: [] })).word).toBe('Not checked');
  });

  it('says what happened to a run that never looked at the ledger', () => {
    expect(lastRunMeta(report({ lastRun: run({ status: 'failed' }), checks: passed })).word).toBe('Failed');
    expect(lastRunMeta(report({ lastRun: run({ status: 'skipped' }), checks: passed })).word).toBe('Skipped');
  });

  it('never shows a pass for a run it does not know', () => {
    const odd = run({ status: 'cancelled' as JobRun['status'] });
    expect(lastRunMeta(report({ lastRun: odd, checks: passed })).word).toBe('Not checked');
  });

  it('does not count a run that is still going as a result', () => {
    expect(finishedRun(report({ lastRun: run({ status: 'running' }) }))).toBeNull();
    expect(finishedRun(report({ lastRun: null }))).toBeNull();
    expect(finishedRun(report())?.status).toBe('succeeded');
  });
});

describe('runningSince', () => {
  const own = { startedAt: '2026-03-05T10:00:00.000Z' };

  it('is null while nothing runs', () => {
    expect(runningSince(report({ running: false }), own)).toBeNull();
  });

  it('uses the running run the server names in lastRun', () => {
    const going = run({ status: 'running', startedAt: '2026-03-05T09:59:00.000Z' });
    expect(runningSince(report({ running: true, lastRun: going }), own)).toBe('2026-03-05T09:59:00.000Z');
  });

  it('uses the run this staff member started when it is newer than the last run that ended', () => {
    expect(runningSince(report({ running: true }), own)).toBe(own.startedAt);
    expect(runningSince(report({ running: true, lastRun: null }), own)).toBe(own.startedAt);
  });

  it('ignores a run of this staff member that has ended since (a newer run is the last one that ended)', () => {
    const later = run({ startedAt: '2026-03-05T10:05:00.000Z' });
    expect(runningSince(report({ running: true, lastRun: later }), own)).toBeNull();
  });

  it('is null when nobody knows when it began', () => {
    expect(runningSince(report({ running: true }), null)).toBeNull();
  });
});
