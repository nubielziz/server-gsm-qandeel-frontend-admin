// Tests for the accrual API functions, run against the dev mock API: the list with its status, agent and date filters, one accrual, and
// the bulk approval with its paid total and skipped accruals.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { recordRequests } from '../test/requests';
import { approveAccruals, getAccrual, listAccruals } from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

describe('listAccruals', () => {
  it('lists the newest first with the agent and the referred merchant joined, and the total in the header', async () => {
    const requests = recordRequests();
    const page = await listAccruals({ start: 0, end: 3, sort: ['createdAt'], order: ['desc'] });
    expect(Object.fromEntries(requests.last().url.searchParams)).toEqual({
      _start: '0',
      _end: '3',
      _sort: 'createdAt',
      _order: 'desc',
    });
    expect(requests.last().url.pathname).toBe('/admin/commission-accruals');
    expect(page.total).toBe(161);
    expect(page.data).toHaveLength(3);
    expect(page.data[0]).toMatchObject({
      id: 161,
      status: 'accrued',
      ledgerTxId: null,
      beneficiary: { id: 5, name: 'Cairo GSM Lab' },
      merchant: { id: 12, name: 'Jeddah Tech Bar' },
      basisAmount: '20.9900',
      percent: '5.0000',
      amount: '1.0500',
    });
  });

  it('filters by status and agent, and counts with a one-row range', async () => {
    const requests = recordRequests();
    const ready = await listAccruals({ start: 0, end: 1, filters: { status: 'accrued' } });
    expect(Object.fromEntries(requests.last().url.searchParams)).toEqual({
      _start: '0',
      _end: '1',
      status: 'accrued',
    });
    expect(ready.total).toBe(49);
    expect((await listAccruals({ filters: { status: 'approved' } })).total).toBe(112);
    const one = await listAccruals({ filters: { status: 'accrued', beneficiaryId: 1 } });
    expect(one.total).toBe(30);
    expect(one.data.every((accrual) => accrual.beneficiaryId === 1)).toBe(true);
  });

  it('filters by the date it was earned', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect((await listAccruals({ filters: { createdAt_gte: future } })).total).toBe(0);
    const past = new Date(Date.now() - 40 * 86_400_000).toISOString();
    expect((await listAccruals({ filters: { createdAt_gte: past } })).total).toBe(161);
  });

  it('gives an approved accrual the ledger journal that paid it', async () => {
    const approved = await listAccruals({ start: 0, end: 1, filters: { status: 'approved' } });
    expect(approved.data[0].ledgerTxId).toEqual(expect.any(Number));
  });
});

describe('getAccrual', () => {
  it('reads one accrual, and refuses one that does not exist', async () => {
    const requests = recordRequests();
    expect(await getAccrual(1)).toMatchObject({
      id: 1,
      status: 'approved',
      beneficiary: { name: 'Zain Mobile Hub' },
    });
    expect(requests.last().url.pathname).toBe('/admin/commission-accruals/1');
    await expect(getAccrual(9999)).rejects.toMatchObject({ status: 404 });
  });
});

describe('approveAccruals', () => {
  it('posts the ids and gets the paid count and total, and the accrual is approved afterwards', async () => {
    const requests = recordRequests();
    const result = await approveAccruals({ ids: [161, 160] });
    expect(requests.last()).toMatchObject({ method: 'POST', body: { ids: [161, 160] } });
    expect(requests.last().url.pathname).toBe('/admin/commission-accruals/approve');
    expect(result).toEqual({ approved: 2, total: '1.2900', skipped: [] });
    const after = await getAccrual(161);
    expect(after.status).toBe('approved');
    expect(after.ledgerTxId).toEqual(expect.any(Number));
    expect((await listAccruals({ start: 0, end: 1, filters: { status: 'accrued' } })).total).toBe(47);
  });

  it('skips an accrual that is already approved or unknown, with a reason, and pays the rest', async () => {
    const result = await approveAccruals({ ids: [1, 161, 9999] });
    expect(result.approved).toBe(1);
    expect(result.total).toBe('1.0500');
    expect(result.skipped).toEqual([
      { id: 1, reason: 'Already approved.' },
      { id: 9999, reason: 'This accrual does not exist.' },
    ]);
  });

  it('refuses a request with no ids', async () => {
    await expect(approveAccruals({ ids: [] })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { ids: ['Choose at least one accrual.'] },
    });
  });
});
