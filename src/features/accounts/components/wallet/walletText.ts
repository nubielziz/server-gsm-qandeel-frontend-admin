// The words of the Financial part and the Statement part: what kind of wallet it is, the hold with its day and reason, the second-approver
// rule, and the signed amount of a statement line. Display only: every figure is the server's and nothing here decides anything.
import type { IsoDateTime, Money } from '@/lib/api';
import { money, toAmount } from '@/lib/format';
import type { WalletHold, WalletKind } from '../../types';

const LONG_DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * A day as "2 Nov 2026", or "" for a missing or unreadable time.
 *
 * @param time an ISO time from the API.
 */
export function longDay(time: IsoDateTime | null | undefined): string {
  if (!time) return '';
  const ms = Date.parse(time);
  return Number.isNaN(ms) ? '' : LONG_DAY.format(ms);
}

/**
 * What the wallet is, in a line: a merchant wallet holds and settles orders, a store balance is spent at checkout.
 *
 * @param kind the wallet's kind.
 */
export function kindText(kind: WalletKind): string {
  return kind === 'merchant'
    ? 'Merchant wallet: orders are held and settled from it'
    : 'Store balance: spent at checkout';
}

/**
 * What a hold does to the person, by kind of wallet: the shop emails a customer whose store balance is put on hold, and a merchant is not
 * emailed (the server sends no mail for a merchant wallet).
 *
 * @param kind the kind of the live wallet.
 */
export function holdMailText(kind: WalletKind): string {
  return kind === 'store' ? 'The person is emailed.' : 'The merchant is not emailed.';
}

/**
 * When the server refuses to lift a hold, by kind of wallet: a store balance below zero or an open dispute of a top-up; a merchant wallet
 * below zero is a use of credit and does not stop it, so only an open dispute does.
 *
 * @param kind the kind of the live wallet.
 */
export function liftRefusalText(kind: WalletKind): string {
  return kind === 'store'
    ? 'Refused while the balance is below zero or a dispute of one of their top-ups is open.'
    : 'Refused while a dispute of one of their top-ups is open.';
}

/**
 * The hold of a wallet as one line: "On hold since 2 Nov 2026: Checking a disputed top-up". A hold without a readable day or a reason drops
 * that part.
 *
 * @param hold the hold the wallet read carries.
 */
export function holdText(hold: WalletHold): string {
  const day = longDay(hold.at);
  const reason = hold.reason.trim();
  return ['On hold', day && `since ${day}`].filter(Boolean).join(' ') + (reason ? `: ${reason}` : '');
}

/**
 * The second-approver rule of the wallet, with the limit the server sent.
 *
 * @param limit the amount above which an adjustment needs a second approver.
 */
export function approverText(limit: Money): string {
  return `Adjustments above ${money(limit)} need a second approver`;
}

/** What the Amount of a statement line shows and how: "+$25.00" for money in, "-$25.00" for money out, a plain "$0.00" for none. */
export function signedAmount(amount: Money): { text: string; direction: 'in' | 'out' | 'none' } {
  const value = toAmount(amount);
  if (value > 0) return { text: `+${money(value)}`, direction: 'in' };
  if (value < 0) return { text: money(value), direction: 'out' };
  return { text: money(0), direction: 'none' };
}

/** Whether a balance is below zero (shown in the critical colour with the alert icon). */
export function isNegative(amount: Money): boolean {
  return toAmount(amount) < 0;
}
