// What the Deposits tab says about a payment: the method names, the status badges, the reasons a deposit can be rejected and
// how they become the one reason the server stores. Ports METHODS, payBadge and the reject dialog of 45-p-finance.js.
import type { BadgeTone, IconName } from '@/components/ui';
import { maskedAccountLabel, money, pct } from '@/lib/format';
import { plainWords } from './kinds';
import type { Payment, PaymentDispute, PaymentStatus } from '../types';

/** The four ways an account pays, as the demo names them (METHODS in 10-data.js). */
export const METHOD_LABEL: Readonly<Record<string, string>> = {
  bank: 'Bank transfer',
  card: 'Card',
  usdt: 'USDT (TRC20)',
  wise: 'Wise',
};

/** The method's name; a method the console has no name for shows its gateway's name, else its own words. */
export function methodLabel(payment: Pick<Payment, 'methodType' | 'gateway'>): string {
  const known = Object.hasOwn(METHOD_LABEL, payment.methodType)
    ? METHOD_LABEL[payment.methodType]
    : undefined;
  return known ?? payment.gateway?.name ?? plainWords(payment.methodType, 'Other');
}

/** A deposit's number as the demo wrote it: 1048 is "PAY-1048". Display only. */
export function paymentLabel(id: number): string {
  return `PAY-${id}`;
}

export type StatusBadge = { tone: BadgeTone; icon: IconName; label: string };

/** The badge of each status (payBadge in 45-p-finance.js): a word and an icon, never a colour alone. */
export const PAYMENT_STATUS_BADGE: Readonly<Record<PaymentStatus, StatusBadge>> = {
  pending: { tone: 'warn', icon: 'clock', label: 'Pending' },
  approved: { tone: 'good', icon: 'checkCircle', label: 'Approved' },
  rejected: { tone: 'crit', icon: 'xCircle', label: 'Rejected' },
};

/** The badge for a status the server sends; one the console does not know shows its own word in grey. */
export function paymentStatusBadge(status: string): StatusBadge {
  return Object.hasOwn(PAYMENT_STATUS_BADGE, status)
    ? PAYMENT_STATUS_BADGE[status as PaymentStatus]
    : { tone: 'neutral', icon: 'info', label: plainWords(status, 'Unknown') };
}

/** The reason that stands for "something else": the message alone is then the reason. */
export const OTHER_REASON = 'Other';

/** The reasons offered when rejecting a deposit (the demo's list). `value` is the text that goes into the reason. */
export const REJECT_REASONS: readonly { value: string; label: string }[] = [
  { value: 'Receipt amount does not match the transfer', label: 'Receipt amount does not match' },
  { value: 'Payment not received in the bank account', label: 'Payment not received' },
  { value: 'Transaction hash not found on-chain', label: 'Transaction hash not found' },
  { value: 'Receipt is unreadable or incomplete', label: 'Receipt unreadable' },
  { value: OTHER_REASON, label: 'Other' },
];

/**
 * The one reason the account holder is shown: the chosen reason, then the message after it ("Receipt amount does not match the
 * transfer. $60 on the receipt"). With "Other" the message is the whole reason; with neither it is just "Rejected".
 */
export function rejectReason(reason: string, message: string): string {
  const note = message.trim();
  const lead = reason === OTHER_REASON ? '' : reason;
  const joiner = lead && note ? '. ' : '';
  return `${lead}${joiner}${note}` || 'Rejected';
}

/** The fee as the demo's dialog shows it: "$25.00 (1%)", or "None" when the deposit had no fee. */
export function feeText(payment: Pick<Payment, 'amount' | 'feeAmount'>): string {
  const fee = Number(payment.feeAmount);
  const paid = Number(payment.amount);
  if (!(fee > 0)) return 'None';
  return paid > 0 ? `${money(payment.feeAmount)} (${pct((fee / paid) * 100, 0)})` : money(payment.feeAmount);
}

/** The chip of a top-up's chargeback, in the words a reviewer needs: a word and an icon, never a colour alone. */
export function disputeChip(dispute: Pick<PaymentDispute, 'status'>): StatusBadge {
  switch (dispute.status) {
    case 'needs_response':
      return { tone: 'crit', icon: 'alert', label: 'Dispute: evidence needed' };
    case 'under_review':
      return { tone: 'warn', icon: 'clock', label: 'Dispute: with the card network' };
    case 'won':
      return { tone: 'good', icon: 'checkCircle', label: 'Dispute won' };
    case 'lost':
      return { tone: 'crit', icon: 'xCircle', label: 'Dispute lost' };
    default:
      return { tone: 'neutral', icon: 'info', label: 'Dispute' };
  }
}

/** Who paid a deposit, for its dialog's subtitle and the table: the merchant account, else the store balance's account, else a plain word. */
export function payerName(payment: Pick<Payment, 'client' | 'customer'>): string {
  if (payment.client) return payment.client.name;
  return payment.customer ? maskedAccountLabel(payment.customer) : '–';
}

/**
 * What a top-up's chargeback means for the money, in a sentence for the reviewer (the facts are in the dialog beside it).
 * A store balance goes on hold when the dispute is raised and the credit is taken back when it is lost; a merchant
 * wallet is debited on a loss. A won dispute changes nothing: staff lift the hold themselves. The server does all of it.
 */
export function disputeText(payment: Pick<Payment, 'customer' | 'dispute'>): string | null {
  const dispute = payment.dispute;
  if (!dispute) return null;
  const account = payment.customer ? 'The account’s store balance' : 'The merchant’s wallet';
  switch (dispute.status) {
    case 'needs_response':
    case 'under_review':
      return payment.customer
        ? `${account} is on hold while the dispute is open.`
        : 'The card network is reviewing the chargeback of this top-up.';
    case 'won':
      return payment.customer
        ? `Nothing was taken back. ${account} stays on hold until someone lifts it.`
        : 'Nothing was taken back from the wallet.';
    case 'lost':
      return `The credit was taken back from ${account.charAt(0).toLowerCase()}${account.slice(1)}${
        payment.customer ? ', which may now be below zero' : ''
      }.`;
    default:
      return null;
  }
}
