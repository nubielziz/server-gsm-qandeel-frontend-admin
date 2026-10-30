// Mock state changes of the two ways to answer a dispute: submit evidence, and accept the loss. They move the dispute, change
// the payment's status, add the timeline line the demo wrote to the order and post the chargeback to the ledger. They fake the
// answers only; the real server owns the rules (decision 014). Ports submitEvidence / acceptDispute of 12-state-b2c.js.
import { lm, round } from '@/lib/format';
import { postLedger } from '@/mocks/ledger';
import { addEvent, orderStore } from '@/mocks/orders';
import type { Actor } from '@/mocks/ordersActions';
import { disputeLabel, storefrontOrderLabel } from '../lib/labels';
import type { Dispute } from '../types';
import type { RefundsMockState } from './seed';

/** The evidence went to the card network: the dispute is under review. */
export async function submitEvidenceMock(dispute: Dispute, actor: Actor): Promise<void> {
  dispute.status = 'under_review';
  dispute.submittedAt = new Date().toISOString();
  const order = (await orderStore()).find(dispute.orderId);
  if (order) addEvent(order, 'dispute', `Evidence pack submitted for ${disputeLabel(dispute.id)}`, actor);
}

/**
 * The loss is accepted: the dispute closes as lost, the payment becomes a chargeback and the amount with the dispute fee is
 * posted to `chargeback_loss`. The mock does not block the customer (the map's accept writes only the dispute and the ledger).
 */
export async function acceptLossMock(state: RefundsMockState, dispute: Dispute, actor: Actor): Promise<void> {
  const total = round(Number(dispute.amount) + Number(dispute.fee), 2);
  dispute.status = 'lost';
  dispute.resolvedAt = new Date().toISOString();
  state.payments.patch(dispute.orderId, { status: 'chargeback' });
  state.chargebackLoss = round(state.chargebackLoss + total, 2);

  const order = (await orderStore()).find(dispute.orderId);
  if (order) {
    const sum = lm(dispute.amount, dispute.currency, dispute.fx);
    addEvent(order, 'dispute', `Dispute accepted, ${sum} returned to the cardholder`, actor);
  }
  await postLedger({
    kind: 'chargeback',
    memo: `Chargeback accepted on ${storefrontOrderLabel(dispute.orderId)} (incl. dispute fee)`,
    orderId: dispute.orderId,
    by: actor.name,
    lines: [
      { kind: 'chargeback_loss', amount: total },
      { kind: 'gateway_clearing', amount: -total },
    ],
  });
}
