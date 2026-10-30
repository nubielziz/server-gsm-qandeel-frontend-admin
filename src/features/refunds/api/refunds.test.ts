// Tests for the refund API functions, run against the dev mock API (`mockServer`): each one reaches its route with the body of its
// assumed contract and reads the answer the way the screens do. The mock keeps simple state, so a decision can be checked by
// reading the refund, the payment, the order's timeline and the ledger again.
import { beforeEach, describe, expect, it } from 'vitest';
import { listLedgerTransactions } from '@/features/finance';
import { listOrderEvents } from '@/features/orders';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { approveRefund, declineRefund, getPaymentsReport, getRefund, listRefunds, retryRefund } from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});

// Refunds of the mock seed (taken from the demo; see src/features/refunds/mocks/seed.ts).
const REQUESTED = 1007; // CAD order SF-20467, $19.99, no VAT
const REQUESTED_USD = 1008; // SF-20478, $11.99
const FAILED = 1011; // EUR order SF-20440 paid in crypto, $4.83 with $0.84 VAT
const DONE = 1010;

describe('listRefunds', () => {
  it('lists every refund with the total in the header', async () => {
    const result = await listRefunds();
    expect(result.total).toBe(11);
    expect(result.data).toHaveLength(11);
  });

  it('counts a status with a one-row call', async () => {
    const requested = await listRefunds({ start: 0, end: 1, filters: { status: 'requested' } });
    expect(requested.total).toBe(3);
    expect(requested.data).toHaveLength(1);
    expect((await listRefunds({ start: 0, end: 1, filters: { status: 'failed' } })).total).toBe(1);
    expect((await listRefunds({ start: 0, end: 1, filters: { status: 'completed' } })).total).toBe(7);
  });

  it('pages and sorts on the server', async () => {
    const newest = await listRefunds({ start: 0, end: 2, sort: ['createdAt'], order: ['desc'] });
    expect(newest.data.map((refund) => refund.id)).toEqual([REQUESTED, DONE]);
    const cheapest = await listRefunds({ start: 0, end: 1, sort: ['amount'], order: ['asc'] });
    expect(cheapest.data[0].id).toBe(FAILED);
    const second = await listRefunds({ start: 2, end: 4, sort: ['createdAt'], order: ['desc'] });
    expect(second.data).toHaveLength(2);
    expect(second.total).toBe(11);
  });

  it('carries the customer, order and payment summaries the screens need', async () => {
    const [row] = (
      await listRefunds({ filters: { status: 'requested' }, sort: ['createdAt'], order: ['desc'] })
    ).data;
    expect(row).toMatchObject({
      id: REQUESTED,
      orderId: 20467,
      status: 'requested',
      amount: '19.9900',
      currency: 'CAD',
      partial: false,
      customer: { name: 'Priya Nair' },
      requestedBy: { type: 'customer' },
      approvedBy: null,
      order: { id: 20467, cost: '9.8000' },
      payment: { method: 'card', brand: 'Mastercard 7803', amount: '19.9900', taxAmount: '0.0000' },
      netAmount: null,
      taxAmount: null,
    });
    expect(row.order.deliveredAt).not.toBeNull();
  });
});

describe('getRefund', () => {
  it('reads one refund', async () => {
    expect(await getRefund(FAILED)).toMatchObject({
      id: FAILED,
      status: 'failed',
      payment: { method: 'crypto' },
    });
  });
  it('answers 404 for a refund that does not exist', async () => {
    await expect(getRefund(999)).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});

describe('approveRefund', () => {
  it('refunds the amount on the request when no amount is sent, and reports the split', async () => {
    const done = await approveRefund(REQUESTED_USD);
    expect(done).toMatchObject({
      status: 'completed',
      amount: '11.9900',
      partial: false,
      method: 'original',
      netAmount: '11.9900',
      taxAmount: '0.0000',
      approvedBy: { name: 'Rami K.' },
    });
    expect(done?.completedAt).not.toBeNull();
    expect(await getRefund(REQUESTED_USD)).toMatchObject({ status: 'completed' });
    expect((await listRefunds({ start: 0, end: 1, filters: { status: 'requested' } })).total).toBe(2);
  });

  it('refunds a part when an amount is sent, and marks the payment part refunded', async () => {
    const done = await approveRefund(REQUESTED, { amount: '5.0000' });
    expect(done).toMatchObject({ status: 'completed', amount: '5.0000', partial: true });
    const report = await getPaymentsReport({ sort: 'orderId', order: 'asc', start: 0, end: 200 });
    expect(report.payments.find((payment) => payment.orderId === 20467)?.status).toBe('partial_refund');
  });

  it('writes the refund to the order’s timeline and to the ledger', async () => {
    await approveRefund(REQUESTED_USD);
    const events = await listOrderEvents(20478);
    expect(events.at(-1)?.data).toMatchObject({ message: expect.stringContaining('Refund of $11.99') });
    const entries = await listLedgerTransactions({ filters: { refType: 'order', refId: 20478 } });
    const refund = entries.data.find((entry) => entry.kind === 'refund');
    expect(refund?.entries.map((line) => line.account.kind)).toEqual(['revenue', 'gateway_clearing']);
    expect(refund?.entries.map((line) => line.amount)).toEqual(['11.9900', '-11.9900']);
  });

  it('refuses a refund that someone already decided', async () => {
    await approveRefund(REQUESTED_USD);
    await expect(approveRefund(REQUESTED_USD)).rejects.toMatchObject({
      status: 409,
      code: 'REFUND_NOT_PENDING',
    });
    await expect(approveRefund(DONE)).rejects.toMatchObject({ status: 409, code: 'REFUND_NOT_PENDING' });
  });

  it('refuses an empty amount or one above what was paid, naming the field', async () => {
    for (const amount of ['0.0000', '25.0000', '-1']) {
      await expect(approveRefund(REQUESTED, { amount })).rejects.toMatchObject({
        status: 422,
        fieldErrors: { amount: [expect.stringContaining('Enter an amount between $0.01 and $19.99')] },
      });
    }
    expect(await getRefund(REQUESTED)).toMatchObject({ status: 'requested' });
  });

  it('answers 404 for a refund that does not exist', async () => {
    await expect(approveRefund(999)).rejects.toMatchObject({ status: 404 });
  });
});

describe('declineRefund', () => {
  it('declines with the message the customer gets', async () => {
    const reason = 'The unlock was delivered, so it cannot be refunded.';
    expect(await declineRefund(REQUESTED_USD, { reason })).toMatchObject({
      status: 'rejected',
      note: reason,
    });
    expect(await getRefund(REQUESTED_USD)).toMatchObject({ status: 'rejected', note: reason });
    const events = await listOrderEvents(20478);
    expect(events.at(-1)?.data).toMatchObject({ message: `Refund request declined: ${reason}` });
  });

  it('wants at least a sentence', async () => {
    await expect(declineRefund(REQUESTED_USD, { reason: 'no' })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { reason: ['Give the customer a reason, at least a sentence.'] },
    });
  });

  it('refuses a refund that was already decided', async () => {
    await expect(declineRefund(DONE, { reason: 'Because we say so, sorry.' })).rejects.toMatchObject({
      status: 409,
    });
  });
});

describe('retryRefund', () => {
  it('sends a failed refund again; a crypto payment is paid out by hand and the VAT is split in proportion', async () => {
    const done = await retryRefund(FAILED);
    expect(done).toMatchObject({
      status: 'completed',
      method: 'manual',
      amount: '4.8300',
      taxAmount: '0.8400',
      netAmount: '3.9900',
    });
    expect(done?.gatewayRefundId).toMatch(/^tx_/);
    expect(done?.note).toContain('Crypto payments cannot be refunded by the gateway');
    const entries = await listLedgerTransactions({ filters: { refType: 'order', refId: 20440 } });
    const refund = entries.data.find((entry) => entry.kind === 'refund');
    expect(refund?.entries.map((line) => line.account.kind)).toEqual([
      'revenue',
      'vat_payable',
      'gateway_clearing',
    ]);
  });

  it('refuses a refund that did not fail', async () => {
    await expect(retryRefund(REQUESTED)).rejects.toMatchObject({ status: 409, code: 'REFUND_NOT_FAILED' });
  });
});
