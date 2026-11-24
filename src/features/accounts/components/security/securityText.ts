// The words of the Security part and its dialogs: how many devices are signed in, what the Password row says (and the note under it
// while a link is open), the Link row, the last sign-in and the address "Last seen from". Pure, so each sentence is a test row.
// The facts are the server's: this file only turns them into words; no date arithmetic decides anything.
import type { IpScope } from '@/features/access';
import { ago } from '@/lib/format';
import type { AccountRow, AccountSecurity } from '../../types';

// A day as people write it ("3 Mar 2026"), in the browser's time zone.
const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** A moment as a day, "3 Mar 2026"; an empty or unreadable value gives ''. */
export function dayText(value: string | null | undefined): string {
  const at = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(at) ? '' : DAY.format(at);
}

/** "1 device" / "3 devices": how many open sessions, in words. */
export function devicesText(count: number): string {
  return `${count} ${count === 1 ? 'device' : 'devices'}`;
}

/** What the Password row says: the word, whether it is a warning, and a note while a link is open. */
export type PasswordWords = { text: string; warn: boolean; note?: string };

const TEMPORARY_STILL_WORKS = 'A temporary password still works while a link is open.';

/**
 * The Password row. "Set", "Not set yet (invitation)" (no password was ever chosen) or "Temporary (must change at next sign-in)" (a
 * warning). While a link is open the note says which one: an invitation before any password, a reset after one; a temporary password
 * that is still waiting to be replaced works until the link is used.
 */
export function passwordText(
  security: Pick<AccountSecurity, 'hasPassword' | 'mustChangePassword' | 'linkSentAt'>,
): PasswordWords {
  const word = !security.hasPassword
    ? { text: 'Not set yet (invitation)', warn: false }
    : security.mustChangePassword
      ? { text: 'Temporary (must change at next sign-in)', warn: true }
      : { text: 'Set', warn: false };
  if (!security.linkSentAt) return word;
  const link = security.hasPassword ? 'A reset link is open.' : 'An invitation link is open.';
  return { ...word, note: security.mustChangePassword ? `${link} ${TEMPORARY_STILL_WORKS}` : link };
}

/** The Link row: when the newest open invitation or reset link went out, and how long it works; null when none is open. */
export function linkText(security: Pick<AccountSecurity, 'linkSentAt'>, now: number): string | null {
  return security.linkSentAt ? `Link sent ${ago(security.linkSentAt, now)}, works for 1 hour` : null;
}

/** "Verification sent 1h ago" while a verification link is open; null when none is. */
export function verificationText(
  security: Pick<AccountSecurity, 'verificationSentAt'>,
  now: number,
): string | null {
  return security.verificationSentAt ? `Verification sent ${ago(security.verificationSentAt, now)}` : null;
}

/** The Last sign-in row: how long ago and from which address; `age` is null when the account never signed in. */
export function lastSignIn(
  security: Pick<AccountSecurity, 'lastLoginAt' | 'lastLoginIp'>,
  now: number,
): { age: string | null; ip: string | null } {
  if (!security.lastLoginAt) return { age: null, ip: null };
  return { age: ago(security.lastLoginAt, now), ip: security.lastLoginIp };
}

/**
 * The address "Last seen from" shows: the address of the account's last sign-in. Null when the account never signed in or the server
 * did not send the sign-in facts. (A guest has no sign-in: its address is in Privacy and risk.)
 */
export function lastSeenIp(account: Pick<AccountRow, 'security'>): string | null {
  return account.security?.lastLoginIp ?? null;
}

/**
 * The audience an address of an account is checked and blocked for, whatever its rank: the shop (the access feature's scope `store`).
 * The sessions this part shows are browser sessions, so the address belongs to the shop even for a merchant rank.
 */
export const LAST_SEEN_SCOPE: IpScope = 'store';

/**
 * What a shop block of an account's address does not stop, for a merchant rank: the block keeps new sign-ins to the shop out, but a merchant
 * who is signed in to the portal (a session lasts up to 30 days) and the merchant API are other places. Null for every other rank.
 *
 * @param account the account whose address is being blocked.
 */
export function blockIpNote(account: Pick<AccountRow, 'rank'>): string | null {
  return account.rank.kind === 'merchant'
    ? 'This stops new shop sign-ins only. A merchant who is already signed in, and their API calls, keep working from this address: choose Everywhere to stop those too, and use Sign out everywhere to end the open sessions.'
    : null;
}

/** The sentence of the sign-out dialog for one account: how many devices are signed in and what happens to them. */
export function signedInText(count: number): string {
  if (count === 0) return 'No device is signed in at the moment.';
  return `${devicesText(count)} ${count === 1 ? 'is' : 'are'} signed in. They must sign in again.`;
}
