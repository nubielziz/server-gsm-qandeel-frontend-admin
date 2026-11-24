// Tests for the audit API functions, run against the dev mock API (`mockServer`): the list pages, sorts and filters like the
// server, and one entry reads with its before and after. The mock is the demo's 42 entries (src/features/audit/mocks/store.ts).
import { beforeEach, describe, expect, it } from 'vitest';
import { isApiError } from '@/lib/api';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { getAuditLog, listAuditLogs } from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});

const NEWEST = { sort: ['createdAt'], order: ['desc' as const] };

describe('listAuditLogs', () => {
  it('lists the entries newest first with the total in the header', async () => {
    const result = await listAuditLogs({ ...NEWEST, start: 0, end: 25 });
    expect(result.total).toBe(42);
    expect(result.data).toHaveLength(25);
    expect(result.data[0]).toMatchObject({
      id: 42,
      actorType: 'staff',
      actorName: 'Lina S.',
      action: 'completed order',
      entityType: 'order',
      entityId: 48792,
      entityLabel: 'ORD-48792 for Zain Mobile Hub',
      before: { status: 'processing' },
      after: { status: 'completed' },
      ip: '198.51.100.77',
    });
    const times = result.data.map((row) => Date.parse(row.createdAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it('reads the next page from where the last one ended', async () => {
    const second = await listAuditLogs({ ...NEWEST, start: 25, end: 50 });
    expect(second.total).toBe(42);
    expect(second.data).toHaveLength(17);
    expect(second.data[0].id).toBe(17);
    expect(second.data.at(-1)?.id).toBe(1);
  });

  it('knows the system by its type and a person by id', async () => {
    const system = await listAuditLogs({ filters: { actorType: 'system' } });
    expect(system.total).toBe(4);
    expect(system.data.every((row) => row.actorId === null && row.ip === null)).toBe(true);
    const lina = await listAuditLogs({ filters: { actorType: 'staff', actorId: 2 } });
    expect(lina.total).toBe(18);
    expect(lina.data.every((row) => row.actorName === 'Lina S.')).toBe(true);
  });

  it('filters by record type and by search text', async () => {
    expect((await listAuditLogs({ filters: { entityType: 'order' } })).total).toBe(14);
    expect((await listAuditLogs({ filters: { entityType: 'merchant' } })).total).toBe(6);
    // The record type "account" lists the rows that say account, merchant or customer.
    expect((await listAuditLogs({ filters: { entityType: 'account' } })).total).toBe(7);
    expect((await listAuditLogs({ q: 'price' })).total).toBe(7);
    expect((await listAuditLogs({ q: 'cairo' })).total).toBe(2);
    expect((await listAuditLogs({ q: 'cairo', filters: { entityType: 'order' } })).total).toBe(0);
  });

  it('filters by one account: its old merchant rows and the old customer rows of its old number', async () => {
    const merchant = await listAuditLogs({ filters: { accountId: 5 } });
    expect(merchant.total).toBe(2);
    expect(merchant.data.every((row) => row.entityType === 'merchant' && row.account?.id === 5)).toBe(true);
    const customer = await listAuditLogs({ filters: { accountId: 119 } });
    expect(customer.total).toBe(1);
    expect(customer.data[0]).toMatchObject({ entityType: 'customer', entityId: 19, account: { id: 119 } });
    // Account 19 is the merchant of that number, never the old customer 19 (who is account 119).
    const nineteen = await listAuditLogs({ filters: { accountId: 19 } });
    expect(nineteen.data.map((row) => row.entityLabel)).toEqual(['Tunis Fix Point']);
  });

  it('says which account an entry is about only for the rows that name one', async () => {
    const orders = await listAuditLogs({ filters: { entityType: 'order' } });
    expect(orders.data.every((row) => row.account === undefined)).toBe(true);
  });

  it('filters by days, both included', async () => {
    const day = (await listAuditLogs({ ...NEWEST, start: 0, end: 1 })).data[0].createdAt.slice(0, 10);
    const today = await listAuditLogs({ filters: { from: day, to: day } });
    expect(today.total).toBeGreaterThan(0);
    expect(today.data.every((row) => row.createdAt.startsWith(day))).toBe(true);
    expect((await listAuditLogs({ filters: { from: '2999-01-01' } })).total).toBe(0);
    expect((await listAuditLogs({ filters: { to: '1999-01-01' } })).total).toBe(0);
    expect((await listAuditLogs({ filters: { from: '1999-01-01', to: '2999-01-01' } })).total).toBe(42);
  });
});

describe('getAuditLog', () => {
  it('reads one entry with its before and after', async () => {
    const entry = await getAuditLog(26);
    expect(entry).toMatchObject({
      id: 26,
      action: 'unlisted from storefront',
      entityType: 'listing',
      before: { is_listed: 'true' },
    });
    expect(entry.after).toMatchObject({ is_listed: 'false' });
  });

  it('keeps a plain action without snapshots', async () => {
    expect(await getAuditLog(34)).toMatchObject({
      action: 'logged in',
      entityType: 'session',
      before: null,
      after: null,
    });
  });

  it('refuses an entry nobody has', async () => {
    const error = await getAuditLog(9999).catch((caught: unknown) => caught);
    expect(isApiError(error) && error.status).toBe(404);
  });
});
