// The words of the Overview part: how a date, an age, a creator, a suspension and each figure is written. Pure functions over what the
// server sent, so each is a test row; the part itself only places them. Every figure is the server's text (money is never added up here).
import { ago, money, money0, num, pct } from '@/lib/format';
import type { Money } from '@/lib/api';
import { percentText } from '../../lib/ranks';
import type { AccountRow, AccountSuspension, RankRef } from '../../types';

const DAY_MS = 86_400_000;
const dayFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** A day as "3 Mar 2026"; empty for a missing or unreadable time, so a bad value shows nothing instead of crashing the part. */
export function dayText(time: string | null | undefined): string {
  if (!time) return '';
  const ms = Date.parse(time);
  return Number.isNaN(ms) ? '' : dayFormat.format(ms);
}

/**
 * How the account came to us: a staff creator means the team added it; else a guest bought as a guest, a retail login signed up in the shop,
 * and a merchant signed up on their own (the shop has no sign-up for a merchant rank, so it was the old portal's). The creator is checked
 * first, whatever the account.
 */
export function createdByText(
  account: Pick<AccountRow, 'createdBy' | 'hasAccount'> & { rank: Pick<RankRef, 'kind'> },
): string {
  if (account.createdBy !== null) return 'Added by your team';
  if (!account.hasAccount) return 'Bought as a guest';
  return account.rank.kind === 'merchant' ? 'Signed up on their own' : 'Signed up in the shop';
}

/** "Joined 410 days ago" in whole days ("Joined today" within a day); empty for an unreadable date. Display only. */
export function joinedText(createdAt: string, now: number): string {
  const days = Math.max(0, Math.floor((now - Date.parse(createdAt)) / DAY_MS));
  if (Number.isNaN(days)) return '';
  if (days === 0) return 'Joined today';
  return `Joined ${days} ${days === 1 ? 'day' : 'days'} ago`;
}

/** "Verified 3 Mar 2026" or "Not verified": whether the person proved the email. */
export function verifiedText(account: Pick<AccountRow, 'emailVerifiedAt'>): string {
  const day = dayText(account.emailVerifiedAt);
  return account.emailVerifiedAt && day ? `Verified ${day}` : 'Not verified';
}

/** What a rank means for the account: a merchant rank with its discount, or the shop's own rank. */
export function rankNote(rank: Pick<RankRef, 'kind' | 'discountPercent'>): string {
  if (rank.kind !== 'merchant') return "the shop's rank";
  return Number(rank.discountPercent) > 0
    ? `merchant rank · ${percentText(rank.discountPercent)} off base prices`
    : 'merchant rank · base prices';
}

/** "Reason: Chargeback dispute · by Rami K. · 6d ago", leaving out what the server did not say; empty when it said nothing. */
export function suspensionLine(suspension: AccountSuspension | null, now: number): string {
  if (!suspension) return '';
  return [
    suspension.reason ? `Reason: ${suspension.reason}` : '',
    suspension.by ? `by ${suspension.by.name}` : '',
    suspension.at ? ago(suspension.at, now) : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

/** The line under an anonymized account's status. */
export function anonymizedLine(anonymizedAt: string | null): string {
  const day = dayText(anonymizedAt);
  return `Anonymized${day ? ` on ${day}` : ''}. Name, email and IMEIs are removed; orders and payments stay for accounting.`;
}

/** The age of the last sign-in, or "Never". */
export function lastSignInText(lastLoginAt: string | null, now: number): string {
  return (lastLoginAt && ago(lastLoginAt, now)) || 'Never';
}

/** What kind of sign-in the account has: none (a guest), an invitation nobody used yet, or a working login. */
export type SignInKind = 'guest' | 'invited' | 'login';

/** A guest has no login; a login with no password yet is an invitation that is still open. */
export function signInKind(account: Pick<AccountRow, 'hasAccount' | 'invitationPending'>): SignInKind {
  if (!account.hasAccount) return 'guest';
  return account.invitationPending ? 'invited' : 'login';
}

/** "link sent 2h ago" for an invitation that is still open; empty when the server names no link. */
export function linkSentText(linkSentAt: string | null | undefined, now: number): string {
  return linkSentAt ? `link sent ${ago(linkSentAt, now)}` : '';
}

/** "$71.23 held in open orders", or "No open holds" when nothing is held. */
export function heldText(reserved: Money): string {
  return Number(reserved) > 0 ? `${money(reserved)} held in open orders` : 'No open holds';
}

/** The note under the spendable figure of a merchant: the wallet plus what it may go below zero. */
export function availableNote(creditLimit: Money): string {
  return `wallet plus ${money0(creditLimit)} credit limit`;
}

/** "3 orders" / "1 order". */
export function ordersText(count: number): string {
  return `${num(count)} ${count === 1 ? 'order' : 'orders'}`;
}

/** The note under the profit: its margin, or that nothing sold yet. */
export function marginText(margin: string | null | undefined): string {
  return margin === null || margin === undefined ? 'No sales yet' : `${pct(margin, 1)} margin`;
}

/** The note under the all-time order count: how long ago the last one was, or that there is none. */
export function lastOrderText(ordersCount: number, lastOrderAt: string | null, now: number): string {
  if (ordersCount === 0) return 'No orders yet';
  return lastOrderAt ? `last ${ago(lastOrderAt, now)}` : '';
}
