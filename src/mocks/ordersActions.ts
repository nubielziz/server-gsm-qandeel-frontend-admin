// Mock state changes of the order actions: accept, complete, reject, reopen, refund, verification, note, dispatch, fetch and
// change-supplier. They move the order between states, add the timeline lines the demo wrote and post the matching ledger
// entries. They fake the answers only; the real server owns the rules (decision 014).
import { money } from '@/lib/format';
import { postLedger, type LedgerLine } from './ledger';
import { addEvent, type MockOrder } from './orders';

/** Who did it: the signed-in staff member. */
export type Actor = { type: 'staff'; id: number | null; name: string };

const SYSTEM = { type: 'system' as const, id: null, name: 'System' };
const amount = (value: string): number => Number(value);

// The account that holds the buyer's money while the order is open: a merchant's hold, or a customer's funds.
function holder(order: MockOrder): Pick<LedgerLine, 'kind' | 'ownerType' | 'ownerId' | 'ownerName'> {
  return order.channel === 'b2c'
    ? { kind: 'customer_funds' }
    : { kind: 'client_hold', ownerType: 'client', ownerId: order.client?.id, ownerName: order.client?.name };
}

const wallet = (order: MockOrder): LedgerLine['kind'] =>
  order.channel === 'b2c' ? 'gateway_clearing' : 'client_wallet';

function supplierAccount(order: MockOrder): Pick<LedgerLine, 'kind' | 'ownerType' | 'ownerId' | 'ownerName'> {
  return {
    kind: 'supplier_prepaid',
    ownerType: 'supplier',
    ownerId: order.supplier?.id,
    ownerName: order.supplier?.name,
  };
}

function closeOrder(order: MockOrder, status: 'completed' | 'rejected'): void {
  order.status = status;
  order.queue = null;
  order.reviewReason = null;
  order.completedAt = new Date().toISOString();
}

/** Accept: a manual order starts processing. */
export function acceptMock(order: MockOrder, actor: Actor): void {
  order.status = 'processing';
  order.queue = null;
  order.reviewReason = null;
  order.dispatchState = 'sent';
  addEvent(order, 'accepted', `Accepted by ${actor.name}, moved to Processing`, actor);
}

/** Reply: complete the order and settle its money. */
export async function completeMock(
  order: MockOrder,
  actor: Actor,
  code: string,
  comment?: string,
): Promise<void> {
  closeOrder(order, 'completed');
  order.result = { code, comment: comment ?? null, fileId: order.result.fileId };
  addEvent(order, 'completed', 'Completed manually', actor);
  const price = amount(order.totalPrice);
  const cost = amount(order.totalCost);
  addEvent(order, 'settle', `Settled: revenue ${money(price)}, cost ${money(cost)}`, SYSTEM);
  await postLedger({
    kind: 'order_settle',
    memo: `Settle ${order.id}`,
    orderId: order.id,
    by: actor.name,
    lines: [
      { ...holder(order), amount: price },
      { kind: 'revenue', amount: -price },
      { kind: 'cogs', amount: cost },
      { ...supplierAccount(order), amount: -cost },
    ],
  });
}

/** Reject: close the order and give the buyer's money back. */
export async function rejectMock(order: MockOrder, actor: Actor, reason: string): Promise<void> {
  closeOrder(order, 'rejected');
  order.result = { code: reason, comment: null, fileId: null };
  addEvent(order, 'rejected', reason, actor, { reason });
  const price = amount(order.totalPrice);
  const tax = amount(order.taxAmount);
  const b2c = order.channel === 'b2c';
  addEvent(
    order,
    b2c ? 'refund' : 'release',
    b2c
      ? `Refund of ${money(price + tax)} sent to the original payment method`
      : `${money(price)} released back to wallet`,
    SYSTEM,
  );
  await postLedger({
    kind: b2c ? 'refund' : 'order_release',
    memo: `${b2c ? 'Refund' : 'Release'} ${order.id}`,
    orderId: order.id,
    by: actor.name,
    lines: [
      { ...holder(order), amount: price },
      ...(b2c && tax > 0 ? [{ kind: 'vat_payable', amount: tax }] : []),
      b2c
        ? { kind: wallet(order), amount: -(price + tax) }
        : {
            kind: 'client_wallet',
            ownerType: 'client' as const,
            ownerId: order.client?.id,
            ownerName: order.client?.name,
            amount: -price,
          },
    ],
  });
}

/** Reopen: a completed order goes back to processing and its settlement is reversed. */
export async function reopenMock(order: MockOrder, actor: Actor, reason?: string): Promise<void> {
  order.status = 'processing';
  order.queue = null;
  order.completedAt = null;
  addEvent(order, 'reopened', reason ? `Reopened: ${reason}` : 'Reopened, back to Processing', actor);
  const price = amount(order.totalPrice);
  const cost = amount(order.totalCost);
  await postLedger({
    kind: 'adjustment',
    memo: `Reopen ${order.id}`,
    orderId: order.id,
    by: actor.name,
    lines: [
      { kind: 'revenue', amount: price },
      { ...holder(order), amount: -price },
      { ...supplierAccount(order), amount: cost },
      { kind: 'cogs', amount: -cost },
    ],
  });
}

/** Refund of a completed merchant order: reopen, then reject. */
export async function refundMock(order: MockOrder, actor: Actor, reason: string): Promise<void> {
  const price = amount(order.totalPrice);
  closeOrder(order, 'rejected');
  order.result = { code: reason, comment: null, fileId: null };
  addEvent(order, 'rejected', reason, actor, { reason });
  addEvent(order, 'refund', `${money(price)} refunded to the wallet`, SYSTEM, { reason });
  await postLedger({
    kind: 'refund',
    memo: `Refund ${order.id}`,
    orderId: order.id,
    by: actor.name,
    lines: [
      { kind: 'revenue', amount: price },
      {
        kind: 'client_wallet',
        ownerType: 'client',
        ownerId: order.client?.id,
        ownerName: order.client?.name,
        amount: -price,
      },
    ],
  });
}

/** Verification: accept keeps the result, refund gives the money back. */
export async function verifyMock(
  order: MockOrder,
  actor: Actor,
  decision: string,
  note?: string,
): Promise<void> {
  order.queue = null;
  order.reviewReason = null;
  order.verificationStatus = decision === 'accept' ? 'accepted' : 'refunded';
  addEvent(
    order,
    'verification',
    `Verification: result ${decision === 'accept' ? 'accepted' : 'refunded'}${note ? `. ${note}` : ''}`,
    actor,
    {
      decision,
    },
  );
  if (decision === 'refund') await refundMock(order, actor, note || 'Verification refund');
}

export function noteMock(order: MockOrder, actor: Actor, body: string): void {
  order.adminNote = body;
  addEvent(order, 'note', body, actor, { body });
}

/** Dispatch: send the order to its supplier again. */
export function dispatchMock(order: MockOrder, actor: Actor): void {
  order.status = 'processing';
  order.queue = null;
  order.reviewReason = null;
  order.dispatchState = 'sent';
  order.attempts += 1;
  order.sentAt = new Date().toISOString();
  addEvent(order, 'retry', `Re-sent to ${order.supplier?.name ?? 'the supplier'}`, actor);
}

/** Fetch: ask the supplier for the result. The mock supplier has nothing yet. */
export function fetchMock(order: MockOrder, actor: Actor): void {
  addEvent(
    order,
    'fetch',
    `Asked ${order.supplier?.name ?? 'the supplier'} for the result: not ready yet`,
    actor,
  );
}

/** Change supplier: point the order at another supplier and optionally forget the old reference. */
export function changeSupplierMock(
  order: MockOrder,
  actor: Actor,
  supplier: { id: number; name: string } | undefined,
  resetReference: boolean,
): void {
  const from = order.supplier?.name ?? 'no supplier';
  if (supplier) order.supplier = supplier;
  if (resetReference) order.supplierRef = null;
  addEvent(
    order,
    'supplier_changed',
    `Supplier changed from ${from} to ${order.supplier?.name ?? 'none'} by ${actor.name}`,
    actor,
  );
}
