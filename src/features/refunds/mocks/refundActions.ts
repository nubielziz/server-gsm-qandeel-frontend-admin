// Mock state changes of the refund decisions: approve (and retry), and decline. They move the refund to its new state, change
// the payment's status, add the timeline line the demo wrote to the order and post the ledger entry. They fake the answers only;
// the real server owns the rules (decision 014). Ports finishRefund / approveRefund / declineRefund of 12-state-b2c.js.
import { lm } from '@/lib/format';
import { postLedger } from '@/mocks/ledger';
import { addEvent, orderStore } from '@/mocks/orders';
import type { Actor } from '@/mocks/ordersActions';
import { toMoney } from '@/mocks/seed';
import { refundLabel, storefrontOrderLabel } from '../lib/labels';
import type { Refund } from '../types';
import { splitRefund } from './split';
import type { RefundsMockState } from './seed';

const CRYPTO_NOTE =
  'Crypto payments cannot be refunded by the gateway. Paid out manually from the treasury wallet.';

let gatewaySeq = 0;

/**
 * Completes a refund for `amount` (USD): revenue and VAT come back in proportion, the gateway id is made up, a crypto
 * payment is marked as paid out by hand, and the payment becomes refunded or part refunded.
 */
export async function completeRefundMock(
  state: RefundsMockState,
  refund: Refund,
  amount: number,
  actor: Actor,
): Promise<void> {
  const gross = Number(refund.payment.amount);
  const split = splitRefund(gross, Number(refund.payment.taxAmount), amount);
  const manual = refund.payment.method === 'crypto';
  const partial = split.total < gross - 0.005;
  gatewaySeq += 1;
  Object.assign(refund, {
    status: 'completed',
    amount: toMoney(split.total),
    partial,
    method: manual ? 'manual' : 'original',
    gatewayRefundId: `${manual ? 'tx' : 're'}_${String(gatewaySeq).padStart(8, '0')}`,
    note: manual ? CRYPTO_NOTE : null,
    approvedBy: { id: actor.id ?? 0, name: actor.name },
    completedAt: new Date().toISOString(),
    netAmount: toMoney(split.net),
    taxAmount: toMoney(split.tax),
  } satisfies Partial<Refund>);
  state.payments.patch(refund.payment.id, { status: partial ? 'partial_refund' : 'refunded' });

  const order = (await orderStore()).find(refund.orderId);
  if (order) {
    const sum = lm(split.total, refund.currency, refund.fx);
    addEvent(
      order,
      'refund',
      `${partial ? 'Partial refund of ' : 'Refund of '}${sum}${manual ? ' paid out manually in USDT' : ' sent to the original payment method'}`,
      actor,
    );
  }
  await postLedger({
    kind: 'refund',
    memo: `Refund ${refundLabel(refund.id)} on ${storefrontOrderLabel(refund.orderId)}`,
    orderId: refund.orderId,
    by: actor.name,
    lines: [
      { kind: 'revenue', amount: split.net },
      ...(split.tax > 0 ? [{ kind: 'vat_payable', amount: split.tax }] : []),
      { kind: 'gateway_clearing', amount: -split.total },
    ],
  });
}

/** Declines a refund: it keeps the message the customer got and the order's timeline says so. */
export async function declineRefundMock(refund: Refund, reason: string, actor: Actor): Promise<void> {
  Object.assign(refund, {
    status: 'rejected',
    note: reason,
    approvedBy: { id: actor.id ?? 0, name: actor.name },
  } satisfies Partial<Refund>);
  const order = (await orderStore()).find(refund.orderId);
  if (order) addEvent(order, 'refund', `Refund request declined: ${reason}`, actor);
}
