// Words and numbers of the Integrity tab (route group health, GET /admin/system/integrity): money differences, who started a
// run, how long ago, and the account kind behind a finding. Plain functions; they print what the server sent and decide nothing.
import { fmtDate, money, num, toAmount, type TimeInput } from '@/lib/format';
import type { Money } from '@/lib/api';
import { formatAgo, formatDuration } from '../../lib';
import type { JobRun } from '../../types';

/** What an absent value prints: the console's en dash. */
export const NONE = '–';

/**
 * A difference in dollars: two decimals, like every amount in the console. The ledger keeps four, so when two decimals
 * would print a real difference as "$0.00" (a failing check that is off by a fraction of a cent) it prints four. A
 * missing difference (a check that does not count money) prints the dash; text that is not a number prints as it came.
 */
export function formatDifference(difference: Money | null | undefined): string {
  if (difference === null || difference === undefined) return NONE;
  const amount = toAmount(difference);
  if (!Number.isFinite(amount)) return String(difference);
  const hiddenByRounding = amount !== 0 && Math.abs(amount) < 0.005;
  return money(difference, hiddenByRounding ? 4 : 2);
}

/** Who started a run: "Scheduled" for the schedule, the staff member's name for a manual run, else the kind of trigger. */
export function startedByText(run: Pick<JobRun, 'trigger' | 'triggeredBy'>): string {
  if (run.trigger === 'schedule') return 'Scheduled';
  if (run.triggeredBy) return run.triggeredBy.name;
  if (run.trigger === 'manual') return 'Manual';
  if (run.trigger === 'event') return 'Event';
  return NONE;
}

/** "3m 12s", or the dash for a run that did not measure its time (skipped, or a value that is not a number). */
export function durationText(run: Pick<JobRun, 'status' | 'durationMs'>): string {
  if (run.status === 'skipped' || !Number.isFinite(run.durationMs)) return NONE;
  return formatDuration(run.durationMs / 1000);
}

/** "8s ago", "44m ago", "2d ago" counted from `now`; an empty text for a time that is missing or unreadable. */
export function agoText(at: TimeInput | null | undefined, now: number): string {
  if (at === null || at === undefined || at === '') return '';
  const ms = typeof at === 'number' ? at : at instanceof Date ? at.getTime() : Date.parse(at);
  return Number.isNaN(ms) ? '' : formatAgo(now - ms);
}

/**
 * A time in two parts, "05 Mar, 14:07" and "44m ago", so the page can keep each part on one line (see `When`). Null for a
 * time that is missing or unreadable.
 */
export function whenParts(
  at: TimeInput | null | undefined,
  now: number,
): { date: string; ago: string } | null {
  const date = fmtDate(at);
  return date ? { date, ago: agoText(at, now) } : null;
}

// The kind of an account as the Finance ledger filters it (`client_wallet`, `bank`): lower case letters, digits and underscores.
const ACCOUNT_KIND = /^[a-z][a-z0-9_]*$/;

/**
 * The account kind in the reference of an account finding. The mock writes `client_wallet:4` (kind, then the owner), so
 * the part before the colon is the kind. A reference that does not start with a kind gives null, and the finding then has
 * no link to the ledger.
 */
export function ledgerAccountKind(ref: string): string | null {
  const kind = ref.split(':')[0].trim();
  return ACCOUNT_KIND.test(kind) ? kind : null;
}

/**
 * What a check's findings list is: "1 finding", "Showing the first 5 of 23", or "23 found, none listed" when the server
 * counted findings but sent none of them. `count` is the server's full number, `listed` how many came with the answer.
 */
export function listedText(count: number, listed: number): string {
  if (listed === 0 && count > 0) return `${num(count)} found, none listed`;
  if (count > listed) return `Showing the first ${num(listed)} of ${num(count)}`;
  return `${num(count)} ${count === 1 ? 'finding' : 'findings'}`;
}
