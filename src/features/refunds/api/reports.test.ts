// Tests for the payments report, run against the dev mock API: the comparison of the methods is always whole, the payments are
// filtered, sorted and paged, and the totals feed the page's strip.
import { beforeEach, describe, expect, it } from 'vitest';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { approveRefund, getPaymentsReport } from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});

describe('getPaymentsReport', () => {
  it('compares the three methods with the demo’s columns', async () => {
    const { methods } = await getPaymentsReport({ start: 0, end: 1 });
    expect(methods.map((row) => row.method)).toEqual(['card', 'wallet', 'crypto']);
    for (const row of methods) {
      expect(row).toEqual({
        method: row.method,
        payments: expect.any(Number),
        volume: expect.stringMatching(/^\d+\.\d{4}$/),
        fees: expect.stringMatching(/^\d+\.\d{4}$/),
        feeRate: expect.any(String),
        refunds: expect.any(Number),
        disputes: expect.any(Number),
      });
    }
    expect(methods.reduce((total, row) => total + row.payments, 0)).toBe(104);
  });

  it('lists the storefront payments newest first, with the total of the filter', async () => {
    const report = await getPaymentsReport({ start: 0, end: 12 });
    expect(report.total).toBe(104);
    expect(report.payments).toHaveLength(12);
    const times = report.payments.map((payment) => Date.parse(payment.createdAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(report.payments[0]).toMatchObject({
      method: expect.any(String),
      brand: expect.any(String),
      currency: expect.any(String),
    });
  });

  it('filters by method but keeps the comparison whole', async () => {
    const crypto = await getPaymentsReport({ method: 'crypto', start: 0, end: 200 });
    expect(crypto.payments.length).toBeGreaterThan(0);
    expect(crypto.payments.every((payment) => payment.method === 'crypto')).toBe(true);
    expect(crypto.total).toBe(crypto.payments.length);
    expect(crypto.methods).toHaveLength(3);
  });

  it('sorts and pages on the server', async () => {
    const cheapest = await getPaymentsReport({ start: 0, end: 3, sort: 'amount', order: 'asc' });
    const amounts = cheapest.payments.map((payment) => Number(payment.amount));
    expect(amounts).toEqual([...amounts].sort((a, b) => a - b));
    const second = await getPaymentsReport({ start: 3, end: 6, sort: 'amount', order: 'asc' });
    expect(Number(second.payments[0].amount)).toBeGreaterThanOrEqual(amounts[2]);
  });

  it('gives the totals of the strip and moves them when a refund is approved', async () => {
    const before = (await getPaymentsReport({ start: 0, end: 1 })).totals;
    expect(before).toMatchObject({
      refundedCount: 7,
      awaitingAmount: '48.8000',
      chargebackLoss: '45.5900',
    });
    await approveRefund(1008);
    const after = (await getPaymentsReport({ start: 0, end: 1 })).totals;
    expect(after.refundedCount).toBe(8);
    expect(Number(after.refundedAmount) - Number(before.refundedAmount)).toBeCloseTo(11.99, 2);
    expect(Number(before.awaitingAmount) - Number(after.awaitingAmount)).toBeCloseTo(11.99, 2);
  });
});
