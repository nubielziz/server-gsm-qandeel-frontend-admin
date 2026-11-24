// The words and looks of an account's status. Ports merBadge of 20-ui.js and CUST_STATUS of 12-state-b2c.js as one: status is shown by a
// square and a word, never colour alone.
import type { SquareTone } from '@/components/ui';
import type { AccountRow, AccountStatus } from '../types';

/** The statuses an account has, in the order the status menu lists them. */
export const ACCOUNT_STATUSES: readonly AccountStatus[] = ['active', 'suspended', 'blocked', 'anonymized'];

/** Whether a value from an address or an answer names a status. */
export function isAccountStatus(value: unknown): value is AccountStatus {
  return ACCOUNT_STATUSES.some((status) => status === value);
}

/**
 * What the list's Status menu and address can say: a stored status, or `invitation` for the active login accounts whose invitation was
 * never used (a state the server derives; the list route takes it as `invitationPending=true`, not as a status).
 */
export type ListStatus = AccountStatus | 'invitation';

/** Whether a value from an address names one of the list's statuses. */
export function isListStatus(value: unknown): value is ListStatus {
  return value === 'invitation' || isAccountStatus(value);
}

/** How a status looks: the word and the tone of its square. */
export type StatusLook = { word: string; tone: SquareTone };

/** The word and tone of each stored status. An account is "Active" only when none of the other facts applies (see `accountStatusLook`). */
export const STATUS_LOOK: Readonly<Record<AccountStatus, StatusLook>> = {
  active: { word: 'Active', tone: 'ok' },
  suspended: { word: 'Suspended', tone: 'warn' },
  blocked: { word: 'Blocked', tone: 'crit' },
  anonymized: { word: 'Anonymized', tone: 'off' },
};

/**
 * A value the console does not know (a new status on the server) shows as it is, so it is never a blank or a crash. An empty or
 * missing value reads "Unknown".
 */
export function rawLabel(value: unknown): string {
  return typeof value === 'string' && value.trim() !== '' ? value : 'Unknown';
}

/** The look of a stored status alone. A status this console does not know gets an off square with its raw value as the word. */
export function statusLook(status: string | null | undefined): StatusLook {
  return typeof status === 'string' && Object.hasOwn(STATUS_LOOK, status)
    ? STATUS_LOOK[status as AccountStatus]
    : { word: rawLabel(status), tone: 'off' };
}

/**
 * The look of an account, by precedence: anonymized, blocked, suspended, guest (no login), invitation pending, then active. A word
 * the console does not know shows as it is. A retired word of the old model (`pending`) is not a status here and shows as it is
 * too: it is never turned into a banner.
 */
export function accountStatusLook(
  account: Pick<AccountRow, 'status' | 'hasAccount' | 'invitationPending'>,
): StatusLook {
  const { status } = account;
  if (status === 'anonymized' || status === 'blocked' || status === 'suspended') return STATUS_LOOK[status];
  if (status !== 'active') return statusLook(status);
  if (!account.hasAccount) return { word: 'Guest', tone: 'off' };
  if (account.invitationPending) return { word: 'Invitation pending', tone: 'warn' };
  return STATUS_LOOK.active;
}
