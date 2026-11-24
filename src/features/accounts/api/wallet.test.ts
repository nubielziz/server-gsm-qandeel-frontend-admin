// Tests for the wallet functions of an account, run against the dev mock API (`mockServer`): each reaches its route with the path, method,
// query, body and Idempotency-Key header of the backend's contract (one address for both wallet kinds), and the mock's refusals reach the
// caller as ApiErrors. Ports the merchant wallet cases and the customer balance cases.
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { KEY_REUSED_WORDS } from '../lib/keyReuse';
import { patchWallet } from '../mocks/walletStore';
import { SEED, spy } from '../test/apiSupport';
import { installAccountMocks } from '../test/installAccountMocks';
import {
  adjustAccountWallet,
  downloadAccountStatement,
  freezeAccountWallet,
  getAccount,
  getAccountWallet,
  listAccountStatement,
  listAccounts,
  setAccountCreditLimit,
  unfreezeAccountWallet,
} from '.';

setupMockApi();
installAccountMocks();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const { ZAIN, FORMER_PENDING, DANIEL, SOFIA } = SEED;
const NEWEST = { start: 0, end: 1, sort: ['createdAt'], order: ['desc' as const] };

describe('reads', () => {
  it('reads the figures of a merchant wallet as the server reports them', async () => {
    expect(await getAccountWallet(ZAIN)).toMatchObject({
      kind: 'merchant',
      currency: 'USD',
      balance: '1209.7500',
      reserved: '71.2300',
      creditLimit: '2000.0000',
      available: '3209.7500',
      creditAllowed: true,
      frozen: null,
      enabled: true,
      openDisputes: 0,
    });
  });

  it('reads the figures of a store balance: no reserve, no credit, a hold, the approval limit', async () => {
    const wallet = await getAccountWallet(DANIEL);
    expect(wallet).toMatchObject({
      kind: 'store',
      enabled: true,
      currency: 'USD',
      balance: '50.0000',
      reserved: '0.0000',
      creditLimit: '0.0000',
      available: '50.0000',
      creditAllowed: false,
      frozen: null,
      openDisputes: 0,
    });
    expect(wallet.adjustApprovalLimit).toMatch(/^\d+\.\d{4}$/);
    expect(wallet.pendingTopUps).toMatchObject({ count: 0 });
  });

  it('gives a guest a wallet with nothing in it', async () => {
    expect(await getAccountWallet(SOFIA)).toMatchObject({
      kind: 'store',
      balance: '0.0000',
      available: '0.0000',
    });
    await expect(getAccountWallet(9999)).rejects.toMatchObject({ status: 404 });
  });

  it('reads a merchant statement newest first, each line with its running balance, down to the wallet balance', async () => {
    const page = await listAccountStatement(ZAIN, { start: 0, end: 5, sort: ['createdAt'], order: ['desc'] });
    expect(page.total).toBeGreaterThan(100);
    expect(page.data).toHaveLength(5);
    expect(page.data[0].balanceAfter).toBe('1209.7500');
    const times = page.data.map((row) => Date.parse(row.createdAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(page.data[0]).toMatchObject({
      transactionId: expect.any(Number),
      kind: expect.any(String),
      memo: expect.any(String),
    });
  });

  it('sends the sort and the date range of the statement and reads the total', async () => {
    const seen = spy('get', '/admin/clients/:id/statement', () =>
      HttpResponse.json([], { headers: { 'x-total-count': '0' } }),
    );
    await listAccountStatement(DANIEL, {
      sort: ['createdAt'],
      order: ['desc'],
      filters: { createdAt_gte: '2026-11-01T00:00:00.000Z', createdAt_lte: '2026-11-30T23:59:59.000Z' },
    });
    expect(seen[0].path).toBe(`/admin/clients/${DANIEL}/statement`);
    expect(seen[0].params.get('createdAt_gte')).toBe('2026-11-01T00:00:00.000Z');
    expect(seen[0].params.get('createdAt_lte')).toBe('2026-11-30T23:59:59.000Z');
    expect(seen[0].params.get('_sort')).toBe('createdAt');
  });

  it('lists the seeded top-up as the first line of a store balance statement', async () => {
    const { data: rows, total } = await listAccountStatement(DANIEL);
    expect(total).toBe(1);
    expect(rows[0]).toMatchObject({ kind: 'deposit', amount: '50.0000', balanceAfter: '50.0000' });
    expect(rows[0].transactionId).toBeGreaterThan(0);
  });
});

describe('adjustAccountWallet', () => {
  it('posts an adjustment with the body and the Idempotency-Key header', async () => {
    const seen = spy('post', '/admin/clients/:id/wallet/adjust', () =>
      HttpResponse.json({ transactionId: 9, wallet: {} }),
    );
    await adjustAccountWallet(
      ZAIN,
      { amount: '10.0000', direction: 'debit', reason: 'Duplicate top-up' },
      'key-adjust-2',
    );
    expect(seen[0].method).toBe('POST');
    expect(seen[0].path).toBe(`/admin/clients/${ZAIN}/wallet/adjust`);
    expect(seen[0].body).toEqual({ amount: '10.0000', direction: 'debit', reason: 'Duplicate top-up' });
    expect(seen[0].headers.get('Idempotency-Key')).toBe('key-adjust-2');
  });

  it('posts a merchant adjustment, shows it as the newest line and moves the balance', async () => {
    const result = await adjustAccountWallet(
      FORMER_PENDING,
      { amount: '25.0000', direction: 'credit', reason: 'Refund for duplicate charge' },
      'key-adjust-1',
    );
    expect(result.wallet).toMatchObject({ balance: '25.0000', available: '325.0000' });
    expect(result.transactionId).toBeGreaterThan(0);
    const [newest] = (await listAccountStatement(FORMER_PENDING, NEWEST)).data;
    expect(newest).toMatchObject({
      transactionId: result.transactionId,
      kind: 'adjustment',
      memo: 'Manual credit: Refund for duplicate charge',
      amount: '25.0000',
      balanceAfter: '25.0000',
    });
  });

  it('moves a store balance, and answers a repeated key with the first adjustment', async () => {
    const body = { amount: '10.0000', direction: 'credit', reason: 'Goodwill credit' } as const;
    const first = await adjustAccountWallet(DANIEL, body, 'key-replay');
    expect(first.wallet.balance).toBe('60.0000');
    const again = await adjustAccountWallet(DANIEL, body, 'key-replay');
    expect(again.transactionId).toBe(first.transactionId);
    expect(again.wallet.balance).toBe('60.0000');
    // Another body under the same key is refused, and the console words the refusal for staff (nothing was posted twice; close the window).
    await expect(
      adjustAccountWallet(DANIEL, { ...body, amount: '11.0000' }, 'key-replay'),
    ).rejects.toMatchObject({
      status: 409,
      code: 'IDEMPOTENCY_KEY_REUSED',
      detail: KEY_REUSED_WORDS,
    });
  });

  it('shows the server’s refusals for a merchant wallet: past the credit limit, and over the approval limit', async () => {
    const past = await adjustAccountWallet(
      ZAIN,
      { amount: '9000.0000', direction: 'debit', reason: 'Too much' },
      'key-adjust-3',
    ).catch((e: unknown) => e);
    expect(past).toMatchObject({ status: 409, code: 'CREDIT_LIMIT_EXCEEDED' });
    expect((past as { detail: string }).detail).toBe(
      'This would take the wallet below the credit limit (-$2,000.00).',
    );
    await expect(
      adjustAccountWallet(
        ZAIN,
        { amount: '10001.0000', direction: 'credit', reason: 'Big credit' },
        'key-adjust-4',
      ),
    ).rejects.toMatchObject({ status: 409, code: 'APPROVAL_REQUIRED' });
    expect((await getAccountWallet(ZAIN)).balance).toBe('1209.7500');
  });

  it('shows the server’s refusals for a store balance: below zero, over the limit, a guest', async () => {
    await expect(
      adjustAccountWallet(DANIEL, { amount: '500.0000', direction: 'debit', reason: 'Too much' }, 'key-a'),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_FUNDS' });
    await expect(
      adjustAccountWallet(
        DANIEL,
        { amount: '9000.0000', direction: 'credit', reason: 'Big credit' },
        'key-b',
      ),
    ).rejects.toMatchObject({ code: 'APPROVAL_REQUIRED' });
    await expect(
      adjustAccountWallet(SOFIA, { amount: '5.0000', direction: 'credit', reason: 'No account' }, 'key-c'),
    ).rejects.toMatchObject({ code: 'NO_ACCOUNT' });
  });

  it('refuses a write without the key, for either kind of wallet', async () => {
    for (const id of [DANIEL, ZAIN]) {
      await expect(
        adjustAccountWallet(id, { amount: '1.0000', direction: 'credit', reason: 'No key' }, ''),
      ).rejects.toMatchObject({ status: 422 });
    }
  });

  it('refuses a bad amount and a short reason with a message on the field', async () => {
    await expect(
      adjustAccountWallet(ZAIN, { amount: '0', direction: 'credit', reason: 'abc' }, 'key-bad'),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: {
        amount: ['Enter an amount greater than zero.'],
        reason: ['Add a reason of at least 5 characters.'],
      },
    });
  });
});

describe('credit limit', () => {
  it('sends the limit and the key', async () => {
    const seen = spy('patch', `/admin/clients/${ZAIN}/credit-limit`, () => HttpResponse.json({}));
    await setAccountCreditLimit(ZAIN, { creditLimit: '3000.0000' }, 'key-limit');
    expect(seen[0]).toMatchObject({ method: 'PATCH', body: { creditLimit: '3000.0000' } });
    expect(seen[0].headers.get('Idempotency-Key')).toBe('key-limit');
  });

  it('keeps the new credit limit on the mock server and the record follows', async () => {
    const wallet = await setAccountCreditLimit(ZAIN, { creditLimit: '3000.0000' }, 'key-limit-2');
    expect(wallet).toMatchObject({ creditLimit: '3000.0000', available: '4209.7500' });
    expect((await getAccount(ZAIN)).wallet?.creditLimit).toBe('3000.0000');
    // The same key again answers without changing anything else.
    expect(await setAccountCreditLimit(ZAIN, { creditLimit: '3000.0000' }, 'key-limit-2')).toMatchObject({
      creditLimit: '3000.0000',
    });
  });

  it('refuses a limit on a store balance, a bad amount and a missing key; zero is allowed', async () => {
    await expect(setAccountCreditLimit(DANIEL, { creditLimit: '5.0000' }, 'k1')).rejects.toMatchObject({
      status: 422,
      fieldErrors: { creditLimit: ['A store balance has no credit limit.'] },
    });
    await expect(setAccountCreditLimit(ZAIN, { creditLimit: '0.0000' }, 'k2')).resolves.toMatchObject({
      creditLimit: '0.0000',
    });
    await expect(setAccountCreditLimit(ZAIN, { creditLimit: '-1' }, 'k3')).rejects.toMatchObject({
      status: 422,
    });
    await expect(setAccountCreditLimit(ZAIN, { creditLimit: '5.0000' }, '')).rejects.toMatchObject({
      status: 422,
    });
  });

  it('refuses a credit limit on a rank that allows no credit', async () => {
    const standard = (await listAccounts({ filters: { rankId: 1 }, start: 0, end: 1 })).data[0];
    await expect(setAccountCreditLimit(standard.id, { creditLimit: '100.0000' }, 'k4')).rejects.toMatchObject(
      {
        status: 422,
        fieldErrors: { creditLimit: ['This rank allows no credit.'] },
      },
    );
  });
});

describe('hold and lift', () => {
  it('freezes a store balance with a reason, then lifts the hold, each with its key', async () => {
    const seen = spy('post', '/admin/clients/:id/wallet/freeze', () => HttpResponse.json({}));
    await freezeAccountWallet(DANIEL, { reason: 'Checking a dispute' }, 'key-f');
    expect(seen[0].body).toEqual({ reason: 'Checking a dispute' });
    expect(seen[0].headers.get('Idempotency-Key')).toBe('key-f');
    mockServer.resetHandlers();
    const frozen = await freezeAccountWallet(DANIEL, { reason: 'Checking a dispute' }, 'key-f2');
    expect(frozen.frozen).toMatchObject({ reason: 'Checking a dispute' });
    expect(frozen.available).toBe('0.0000');
    expect((await getAccount(DANIEL)).wallet?.frozen).toBe(true);
    const lifted = await unfreezeAccountWallet(DANIEL, { reason: 'The dispute was won' }, 'key-u');
    expect(lifted.frozen).toBeNull();
  });

  it('puts a merchant wallet on hold too, and refuses a short reason and a missing key', async () => {
    expect((await freezeAccountWallet(ZAIN, { reason: 'Chargeback review' }, 'key-m')).frozen).not.toBeNull();
    await expect(freezeAccountWallet(ZAIN, { reason: 'no' }, 'key-m2')).rejects.toMatchObject({
      status: 422,
    });
    await expect(unfreezeAccountWallet(ZAIN, { reason: 'Review done' }, '')).rejects.toMatchObject({
      status: 422,
    });
  });

  it('lifts the hold of a merchant wallet that is below zero: that is a use of credit, not a reason to stay on hold', async () => {
    await freezeAccountWallet(ZAIN, { reason: 'Chargeback review' }, 'key-n1');
    await adjustAccountWallet(
      ZAIN,
      { amount: '2000.0000', direction: 'debit', reason: 'Clawback' },
      'key-n2',
    );
    expect(Number((await getAccountWallet(ZAIN)).balance)).toBeLessThan(0);
    expect((await unfreezeAccountWallet(ZAIN, { reason: 'Credit in use' }, 'key-n3')).frozen).toBeNull();
  });

  it('refuses to lift the hold of a store balance below zero', async () => {
    await freezeAccountWallet(DANIEL, { reason: 'Chargeback review' }, 'key-s1');
    // A lost chargeback takes a store balance below zero; the mock's debit rule never does, so the balance is set by the store itself.
    await patchWallet(DANIEL, { balance: -20 * 10_000 });
    expect(Number((await getAccountWallet(DANIEL)).balance)).toBeLessThan(0);
    await expect(unfreezeAccountWallet(DANIEL, { reason: 'Too early' }, 'key-s3')).rejects.toMatchObject({
      status: 409,
      code: 'CONFLICT',
    });
  });

  it('refuses to raise the credit limit of a merchant wallet that is on hold, and lowering it still works', async () => {
    await freezeAccountWallet(ZAIN, { reason: 'Chargeback review' }, 'key-h1');
    await expect(setAccountCreditLimit(ZAIN, { creditLimit: '3000.0000' }, 'key-h2')).rejects.toMatchObject({
      status: 409,
      code: 'WALLET_FROZEN',
    });
    expect((await setAccountCreditLimit(ZAIN, { creditLimit: '1000.0000' }, 'key-h3')).creditLimit).toBe(
      '1000.0000',
    );
  });
});

describe('the official statement', () => {
  it('downloads the statement of a merchant wallet as a file named by the server', async () => {
    const created: Blob[] = [];
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: (blob: Blob) => (created.push(blob), 'blob:test'),
        revokeObjectURL: vi.fn(),
      }),
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    expect(await downloadAccountStatement(ZAIN)).toBe('statement-1-mock.pdf');
    expect(created).toHaveLength(1);
    await expect(downloadAccountStatement(9999)).rejects.toMatchObject({ status: 404 });
    await expect(downloadAccountStatement(DANIEL)).rejects.toMatchObject({ status: 409 });
  });

  it('falls back to a name of its own when the server names no file', async () => {
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: () => 'blob:test', revokeObjectURL: vi.fn() }),
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    mockServer.use(http.get('*/admin/reports/client-statement/:clientId', () => new HttpResponse('pdf')));
    expect(await downloadAccountStatement(ZAIN)).toBe('statement-1.pdf');
  });
});
