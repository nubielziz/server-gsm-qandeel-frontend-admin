// Money integrity checks: `GET /admin/system/integrity` and `POST /admin/system/integrity/run`. The check only reads
// the ledger; corrections are reversing entries made in Finance. Assumed contract.
import type { Id, IsoDateTime, Money } from '@/lib/api';
import type { JobRun } from './queues';

/**
 * The ledger checks, in the server's order: the four of the map, then `wallets_follow_rank`, which looks at the wallets of the
 * accounts (one live wallet of the kind of the rank; no balance or overdraft on the other kind; no overdraft on a rank without
 * credit; every ledger account owned by an account that exists).
 */
export type IntegrityCheckKey =
  | 'entries_balanced'
  | 'accounts_match_lines'
  | 'stuck_holds'
  | 'payments_without_entry'
  | 'wallets_follow_rank';

/** Result of one check in the last run; `unknown` when it has never run or could not finish. */
export type IntegrityStatus = 'pass' | 'fail' | 'unknown';

/** One problem a check found: an unbalanced entry, an account (or a wallet) off from its lines or its rank, an old hold or a lone payment. */
export interface IntegrityFinding {
  kind: 'entry' | 'account' | 'hold' | 'payment';
  id: Id;
  /** Journal number, account code or payment reference, shown in mono. */
  ref: string;
  label: string;
  /** How far off it is, when the check measures money. */
  difference: Money | null;
  /** Age in seconds (holds). */
  ageSeconds: number | null;
  /** The last entry written for it (accounts). */
  lastEntryAt: IsoDateTime | null;
}

/** One check of the last run, with the first findings (`count` is the full number). */
export interface IntegrityCheck {
  key: IntegrityCheckKey;
  label: string;
  status: IntegrityStatus;
  count: number;
  /** Sum of the differences, when the check measures money. */
  difference: Money | null;
  findings: IntegrityFinding[];
}

/** Answer of `GET /admin/system/integrity`. `running` is true while a run started by the schedule or by staff works. */
export interface IntegrityReport {
  running: boolean;
  lastRun: JobRun | null;
  lastSuccessAt: IsoDateTime | null;
  checks: IntegrityCheck[];
}
