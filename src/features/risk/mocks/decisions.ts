// What approving or refunding a held order changes in the mocks: the shared order store (the order leaves the review queue,
// gets its timeline lines and, for a refund, its ledger entries) and the risk state (who decided, what, and the blocklist
// entries a "refund and block" adds). Ports `approveHeld` and `refundAndBlock` of 12-state-b2c.js. Mock data only.
import { addEvent, type MockOrder } from '@/mocks/orders';
import { rejectMock, type Actor } from '@/mocks/ordersActions';
import { fmtImei } from '@/lib/format';
import type { BlocklistEntry, NamedRef, RefundHeldBody, RiskOutcome } from '../types';
import type { MockAssessment, RiskMockState } from './seed';

const SYSTEM = { type: 'system' as const, id: null, name: 'System' };

/** The reason a refund gets when the person wrote none (the demo wrote it from the first signal). */
export function defaultReason(assessment: MockAssessment): string {
  return `Refunded after risk review: ${assessment.signals[0] ?? 'high risk score'}`;
}

function stamp(assessment: MockAssessment, actor: Actor, outcome: RiskOutcome): void {
  const by: NamedRef | null = actor.id === null ? null : { id: actor.id, name: actor.name };
  assessment.reviewedBy = by ?? { id: 0, name: actor.name };
  assessment.reviewedAt = new Date().toISOString();
  assessment.outcome = outcome;
}

/** Approve: the order goes to its supplier (processing, out of the review queue) and the decision is recorded. */
export function approveMock(assessment: MockAssessment, order: MockOrder, actor: Actor): void {
  order.status = 'processing';
  order.queue = null;
  order.reviewReason = null;
  order.dispatchState = 'sent';
  order.attempts = 1;
  order.sentAt = new Date().toISOString();
  addEvent(order, 'risk', 'Risk review: approved, sent to supplier', actor);
  addEvent(order, 'dispatch', `Sent to ${order.supplier?.name ?? 'the supplier'}`, SYSTEM);
  stamp(assessment, actor, 'approved');
}

/** Adds an entry unless the same one is already there; returns whether it was added. */
export function addBlock(
  state: RiskMockState,
  entry: Pick<BlocklistEntry, 'kind' | 'display' | 'reason'> & { createdBy: NamedRef | null },
): BlocklistEntry | null {
  const exists = state.blocklist
    .list()
    .some((row) => row.kind === entry.kind && row.display === entry.display);
  if (exists) return null;
  return state.blocklist.insert({
    kind: entry.kind,
    display: entry.display,
    reason: entry.reason,
    expiresAt: null,
    source: 'manual',
    createdBy: entry.createdBy,
    createdAt: new Date().toISOString(),
  });
}

/** Refund: the customer gets the money back, the supplier is never contacted, and the chosen blocks are added. */
export async function refundMock(
  state: RiskMockState,
  assessment: MockAssessment,
  order: MockOrder,
  actor: Actor,
  body: RefundHeldBody,
): Promise<void> {
  const reason = body.reason?.trim() || defaultReason(assessment);
  addEvent(order, 'risk', 'Risk review: refunded', actor);
  await rejectMock(order, actor, reason);
  stamp(assessment, actor, 'refunded');
  const createdBy = assessment.reviewedBy;
  if (body.blockEmail) {
    // The demo shows a blocked email with the middle starred out.
    const display = assessment.customer.email.replace(/^(.{2}).*(@.*)$/, '$1****$2');
    addBlock(state, { kind: 'email', display, reason, createdBy });
  }
  if (body.blockDevice)
    addBlock(state, { kind: 'imei', display: fmtImei(assessment.imei), reason, createdBy });
}
