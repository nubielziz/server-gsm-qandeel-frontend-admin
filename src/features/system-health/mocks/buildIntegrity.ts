// The answer of `GET /admin/system/integrity`: the four ledger checks of the last finished run, and whether a run is
// working now. The check only reads the ledger; the mock never changes a balance.
import type { IntegrityReport } from '../types';
import { runningRun } from './runs';
import type { HealthState } from './state';

/** `GET /admin/system/integrity`. A run in progress is `running: true`; `lastRun` is the last one that ended. */
export function buildIntegrity(state: HealthState): IntegrityReport {
  const finished = state.runs
    .list()
    .filter((run) => run.job === 'ledger_integrity' && run.status !== 'running')
    .sort((a, b) => Date.parse(b.startedAt ?? '') - Date.parse(a.startedAt ?? ''));
  return {
    running: runningRun(state, 'ledger_integrity') !== undefined,
    lastRun: finished[0] ?? null,
    lastSuccessAt: state.lastSuccessAt,
    checks: state.checks,
  };
}
