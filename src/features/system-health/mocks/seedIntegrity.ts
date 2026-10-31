// Seed of the money integrity checks of the System health mock: four checks that pass, or in the ledger-mismatch
// scenario one account that does not match the sum of its lines (the map's `system-integrity` scenario).
import type { IntegrityCheck, IntegrityCheckKey, JobRun } from '../types';
import { HOUR, iso } from './clock';
import { MISMATCH_CLIENT_ID } from './profile';

const CHECKS: { key: IntegrityCheckKey; label: string; money: boolean }[] = [
  { key: 'entries_balanced', label: 'Every entry sums to zero', money: true },
  { key: 'accounts_match_lines', label: 'Every account balance equals the sum of its lines', money: true },
  { key: 'stuck_holds', label: 'No hold is stuck for more than 24 hours', money: false },
  { key: 'payments_without_entry', label: 'Every confirmed payment has an entry', money: true },
];

/** The four checks as a run ends: all pass, or (with a difference in a merchant wallet) the account check fails. */
export function seedChecks(mismatch: boolean, anchor: number): IntegrityCheck[] {
  return CHECKS.map(({ key, label, money }): IntegrityCheck => {
    if (mismatch && key === 'accounts_match_lines') {
      return {
        key,
        label,
        status: 'fail',
        count: 1,
        difference: '-37.5000',
        findings: [
          {
            kind: 'account',
            id: 214,
            ref: `client_wallet:${MISMATCH_CLIENT_ID}`,
            label: 'Wallet · Basra Unlock Center',
            difference: '-37.5000',
            ageSeconds: null,
            lastEntryAt: iso(anchor - 3 * HOUR),
          },
        ],
      };
    }
    return { key, label, status: 'pass', count: 0, difference: money ? '0.0000' : null, findings: [] };
  });
}

/** How many checks of a finished run failed, as the run's result says (0 when it says nothing). */
export function failedChecksOf(run: Pick<JobRun, 'result'>): number {
  const failed = run.result?.failedChecks;
  return typeof failed === 'number' ? failed : 0;
}

/** The newest integrity run that passed every check: its end is "last success". */
export function lastCleanRun(runs: JobRun[]): JobRun | undefined {
  return runs
    .filter(
      (run) => run.job === 'ledger_integrity' && run.status === 'succeeded' && failedChecksOf(run) === 0,
    )
    .sort((a, b) => Date.parse(b.startedAt ?? '') - Date.parse(a.startedAt ?? ''))[0];
}
