// Tests for the ledger API functions, run against the dev mock API: the order drawer's money trail (entries filtered by what they
// are about) and one entry by id.
import { beforeEach, describe, expect, it } from 'vitest';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { getLedgerTransaction, listLedgerTransactions } from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});

describe('listLedgerTransactions', () => {
  it('reads the entries posted for one order, with signed lines that sum to zero', async () => {
    const { data, total } = await listLedgerTransactions({
      filters: { refType: 'order', refId: 48100 },
      sort: ['createdAt'],
      order: ['asc'],
    });
    expect(total).toBe(data.length);
    expect(data.map((entry) => entry.kind)).toEqual(['order_hold', 'order_settle']);
    expect(data.every((entry) => entry.refType === 'order' && entry.refId === 48100)).toBe(true);
    for (const entry of data) {
      expect(entry.entries.reduce((sum, line) => sum + Number(line.amount), 0)).toBeCloseTo(0);
    }
    expect(data[0].entries[0]).toMatchObject({
      account: { kind: 'client_wallet', ownerType: 'client' },
      amount: expect.stringMatching(/^-?\d+\.\d{4}$/),
    });
  });

  it('pages the whole ledger and filters by kind', async () => {
    const page = await listLedgerTransactions({ start: 0, end: 10 });
    expect(page.data).toHaveLength(10);
    expect(page.total).toBeGreaterThan(1000);
    const settled = await listLedgerTransactions({ start: 0, end: 1, filters: { kind: 'order_settle' } });
    expect(settled.total).toBeGreaterThan(100);
  });
});

describe('getLedgerTransaction', () => {
  it('reads one entry with its lines, and answers 404 for one that does not exist', async () => {
    const entry = await getLedgerTransaction(25);
    expect(entry).toMatchObject({ id: 25, kind: 'order_hold', memo: 'Hold for ORD-48100' });
    expect(entry.entries).toHaveLength(2);
    await expect(getLedgerTransaction(999999)).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});
