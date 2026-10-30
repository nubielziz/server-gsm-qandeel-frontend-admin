// What the Deposits tab says about a payment: the method names, the status badges, the reasons a deposit can be rejected and
// how they become the one reason the server stores. Ports METHODS, payBadge and the reject dialog of 45-p-finance.js.
import type { BadgeTone, IconName } from '@/components/ui';
import { money, pct } from '@/lib/format';
import { plainWords } from './kinds';
import type { Payment, PaymentStatus } from '../types';

/** The four ways a merchant pays, as the demo names them (METHODS in 10-data.js). */
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
 * The one reason the merchant is shown: the chosen reason, then the message after it ("Receipt amount does not match the
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
