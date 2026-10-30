// Small display rules of the review queue: how long a customer has waited, the amount line of a card, the history line
// and the words of the refund dialog. Ports the text built in `heldCard`, `tabQueue` and `rk-refund` of 54-p-risk.js.
// Nothing here scores or decides an order; it only words what the server sent.
import { lm, money, sum, toAmount } from '@/lib/format';
import type { DecidedOrder, HeldOrder, PaymentMethod } from '../types';
import { labelOf, PAYMENT_LABEL } from './labels';

const HOUR_MS = 3_600_000;

/** After this long the card says the customer is waiting (the demo's `3 * HOUR`). */
export const LONG_WAIT_MS = 3 * HOUR_MS;

/** Milliseconds since an ISO time, never negative (a clock a little ahead of the server's). */
export function waitMs(paidAt: string, now: number): number {
  return Math.max(0, now - Date.parse(paidAt));
}

/** The held orders, longest wait first (the demo's `held.sort((a, b) => a.created - b.created)`). */
export function oldestFirst(held: readonly HeldOrder[]): HeldOrder[] {
  return [...held].sort((a, b) => Date.parse(a.paidAt) - Date.parse(b.paidAt));
}

/** How long the longest-waiting order has waited, or null for an empty queue. */
export function longestWaitMs(held: readonly HeldOrder[], now: number): number | null {
  if (held.length === 0) return null;
  return waitMs(oldestFirst(held)[0].paidAt, now);
}

/** What the held orders captured together, for the strip's sub line. Display only: the orders carry the real amounts. */
export function capturedTotal(held: readonly HeldOrder[]): number {
  return sum(held, (order) => toAmount(order.capturedAmount));
}

/** The amount in the customer's currency, with the dollar amount in brackets when it differs: "£10.27 ($12.99)". */
export function amountText(
  order: Pick<HeldOrder | DecidedOrder, 'capturedAmount' | 'currency' | 'fxRate'>,
): string {
  const local = lm(order.capturedAmount, order.currency, order.fxRate);
  return order.currency === 'USD' ? local : `${local} (${money(order.capturedAmount)})`;
}

/** "by card (3ds)": the demo writes the method's label in lower case. */
export function methodText(method: PaymentMethod): string {
  return labelOf(PAYMENT_LABEL, method).toLowerCase();
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "2 earlier orders, 1 refund, 0 disputes", or "First order". */
export function historyText(history: HeldOrder['customer']['history']): string {
  if (history.earlierOrders <= 0) return 'First order';
  return [
    `${count(history.earlierOrders, 'earlier order', 'earlier orders')}`,
    count(history.refunds, 'refund', 'refunds'),
    count(history.disputes, 'dispute', 'disputes'),
  ].join(', ');
}

/** The reason the refund dialog starts with: the demo wrote it from the first signal. The person can change it. */
export function defaultRefundReason(signals: readonly string[]): string {
  return `Refunded after risk review: ${signals[0] ?? 'high risk score'}`;
}

/** Where the money goes back to; crypto cannot be reversed by the console, so the team does it by hand. */
export function refundDestination(method: PaymentMethod): string {
  return method === 'crypto' ? 'wallet by hand (crypto can’t be reversed automatically)' : 'card';
}
