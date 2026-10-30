// Tests for the dispute API functions, run against the dev mock API: the list leaves the evidence pack out, the single read
// carries it, and the two answers change the dispute, the payment and the ledger.
import { beforeEach, describe, expect, it } from 'vitest';
import { listLedgerTransactions } from '@/features/finance';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { acceptDispute, getDispute, getPaymentsReport, listDisputes, submitDisputeEvidence } from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});

// Disputes of the mock seed.
const SOON = 2004; // needs evidence, due in about two days, paid by wallet with 3-D Secure
const LATER = 2005; // needs evidence, due in about six days
const REVIEW = 2003;
const WON = 2002;

describe('listDisputes', () => {
  it('lists the disputes with the total and no evidence pack', async () => {
    const result = await listDisputes();
    expect(result.total).toBe(5);
    for (const row of result.data) {
      expect(row.evidence).toBeUndefined();
      expect(row.strength).toBeUndefined();
    }
  });

  it('puts the soonest deadline first when asked, and counts a status', async () => {
    const soonest = await listDisputes({
      sort: ['evidenceDueAt'],
      order: ['asc'],
      filters: { status: 'needs_response' },
    });
    expect(soonest.data.map((row) => row.id)).toEqual([SOON, LATER]);
    expect((await listDisputes({ start: 0, end: 1, filters: { status: 'under_review' } })).total).toBe(1);
  });

  it('carries the amount, the fee, the reason and the customer', async () => {
    const { data } = await listDisputes({
      filters: { status: 'needs_response' },
      sort: ['id'],
      order: ['desc'],
    });
    expect(data[0]).toMatchObject({
      id: LATER,
      orderId: 20408,
      amount: '15.5900',
      fee: '15.0000',
      currency: 'GBP',
      reasonCode: 'Product not received (13.1)',
      customer: { name: 'Daniel Whitmore' },
    });
  });
});

describe('getDispute', () => {
  it('brings the six lines of the evidence pack and how strong the case is', async () => {
    const dispute = await getDispute(SOON);
    expect(dispute.evidence?.map((item) => item.key)).toEqual([
      'payment',
      'three_ds',
      'delivery',
      'consents',
      'history',
      'contact',
    ]);
    expect(dispute.evidence?.find((item) => item.key === 'three_ds')).toMatchObject({ ok: true });
    expect(dispute.strength).toMatch(/^(strong|fair|weak)$/);
  });

  it('answers 404 for a dispute that does not exist', async () => {
    await expect(getDispute(9)).rejects.toMatchObject({ status: 404 });
  });
});

describe('submitDisputeEvidence', () => {
  it('sends the chosen lines and moves the dispute to the card network', async () => {
    const done = await submitDisputeEvidence(SOON, {
      items: ['payment', 'three_ds'],
      note: 'Delivered by email.',
    });
    expect(done).toMatchObject({ status: 'under_review' });
    expect(done?.submittedAt).not.toBeNull();
    expect(await getDispute(SOON)).toMatchObject({ status: 'under_review' });
  });

  it('wants at least one line, and only lines of the pack', async () => {
    await expect(submitDisputeEvidence(SOON, { items: [] })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { items: ['Choose at least one item of evidence.'] },
    });
    await expect(submitDisputeEvidence(SOON, { items: ['nope'] })).rejects.toMatchObject({ status: 422 });
  });

  it('refuses a dispute that is not waiting for evidence', async () => {
    await expect(submitDisputeEvidence(REVIEW, { items: ['payment'] })).rejects.toMatchObject({
      status: 409,
      code: 'DISPUTE_NOT_OPEN',
    });
  });
});

describe('acceptDispute', () => {
  it('closes the dispute as lost, records the amount and fee as a chargeback loss and marks the payment', async () => {
    const before = (await getPaymentsReport({ start: 0, end: 1 })).totals.chargebackLoss;
    const done = await acceptDispute(SOON);
    expect(done).toMatchObject({ status: 'lost' });
    expect(done?.resolvedAt).not.toBeNull();

    const after = (await getPaymentsReport({ start: 0, end: 1 })).totals.chargebackLoss;
    expect(Number(after) - Number(before)).toBeCloseTo(11.99 + 15, 2);

    const entries = await listLedgerTransactions({ filters: { refType: 'order', refId: 20405 } });
    const loss = entries.data.find((entry) => entry.kind === 'chargeback');
    expect(loss?.entries.map((line) => [line.account.kind, line.amount])).toEqual([
      ['chargeback_loss', '26.9900'],
      ['gateway_clearing', '-26.9900'],
    ]);
    const report = await getPaymentsReport({ start: 0, end: 200 });
    expect(report.payments.find((payment) => payment.orderId === 20405)?.status).toBe('chargeback');
  });

  it('refuses a dispute that is already closed', async () => {
    await expect(acceptDispute(WON)).rejects.toMatchObject({ status: 409, code: 'DISPUTE_NOT_OPEN' });
  });
});
