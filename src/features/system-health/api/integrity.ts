// Money integrity checks for the Integrity tab: `GET /admin/system/integrity` and `POST /admin/system/integrity/run`.
// The check only reads the ledger; a difference is fixed with a reversing entry in Finance. Assumed contracts.
import { apiGet, apiPost, type ApiInit } from '@/lib/api';
import type { IntegrityReport, JobRun } from '../types';

/**
 * The four ledger checks (entries sum to zero, balances equal their lines, holds stuck over 24 hours, confirmed
 * payments without an entry) with the first findings of each, and the last run. While a run works, `running` is true
 * and the tab reads this again every few seconds.
 * Assumed contract: answer `IntegrityReport`; no query.
 * @route GET /admin/system/integrity
 */
export function getIntegrity(init?: ApiInit): Promise<IntegrityReport> {
  return apiGet<IntegrityReport>('/admin/system/integrity', undefined, init);
}

/**
 * Starts the integrity check now as a background job; the result appears in `getIntegrity`. Nothing is corrected.
 * Assumed contract: no body; answer the run just queued (`JobRun`). The console does not read the answer: it reads
 * the report again and polls while `running` is true.
 * @route POST /admin/system/integrity/run
 */
export function runIntegrityCheck(init?: ApiInit): Promise<JobRun> {
  return apiPost<JobRun>('/admin/system/integrity/run', undefined, init);
}
