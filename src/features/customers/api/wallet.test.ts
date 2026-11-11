// Tests for the customer wallet API functions, run against the dev mock API: each reaches its route with the path, method, query,
// body and Idempotency-Key header of the backend's contract, and the mock's refusals reach the caller as ApiErrors.
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiError } from '@/lib/api';
import { mockServer } from '@/mocks/node';
import { setupMockApi, signInAs } from '@/test/mockApi';
import {
  adjustCustomerWallet,
  freezeCustomerWallet,
  getCustomerWallet,
  listCustomerWalletStatement,
  unfreezeCustomerWallet,
} from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

const DANIEL = 1; // an account with the seeded $50 top-up
const SOFIA = 2; // a guest: no account, so nothing to credit

type Seen = { method: string; path: string; params: URLSearchParams; body: unknown; headers: Headers };

/** Records how a route is called, then answers with `reply`. */
function recording(method: 'get' | 'post', pattern: string, reply: () => Response): Seen[] {
  const seen: Seen[] = [];
  mockServer.use(
    http[method](pattern, async ({ request }) => {
      const url = new URL(request.url);
      const text = await request.clone().text();
      seen.push({
        method: request.method,
        path: url.pathname,
        params: url.searchParams,
        body: text ? JSON.parse(text) : undefined,
        headers: request.headers,
      });
      return reply();
    }),
  );
  return seen;
}

describe('reads', () => {
  it('reads the figures of a customer balance', async () => {
    const wallet = await getCustomerWallet(DANIEL);
    expect(wallet).toMatchObject({
      enabled: true,
      currency: 'USD',
      balance: '50.0000',
      available: '50.0000',
      frozen: null,
      openDisputes: 0,
    });
    expect(wallet.adjustApprovalLimit).toMatch(/^\d+\.\d{4}$/);
  });

  it('sends the sort and the date range of the statement and reads the total', async () => {
    const seen = recording('get', '*/admin/customers/:id/wallet/statement', () =>
      HttpResponse.json([], { headers: { 'x-total-count': '0' } }),
    );
    await listCustomerWalletStatement(DANIEL, {
      sort: ['createdAt'],
      order: ['desc'],
      filters: { createdAt_gte: '2026-11-01T00:00:00.000Z', createdAt_lte: '2026-11-30T23:59:59.000Z' },
    });
    expect(seen[0].path).toBe(`/admin/customers/${DANIEL}/wallet/statement`);
    expect(seen[0].params.get('createdAt_gte')).toBe('2026-11-01T00:00:00.000Z');
    expect(seen[0].params.get('createdAt_lte')).toBe('2026-11-30T23:59:59.000Z');
    expect(seen[0].params.get('_sort')).toBe('createdAt');
  });

  it('lists the seeded top-up as the first statement line', async () => {
    const { data: rows, total } = await listCustomerWalletStatement(DANIEL);
    expect(total).toBe(1);
    expect(rows[0]).toMatchObject({ kind: 'deposit', amount: '50.0000', balanceAfter: '50.0000' });
  });
});

describe('writes', () => {
  it('posts an adjustment with the body and the Idempotency-Key header', async () => {
    const seen = recording('post', '*/admin/customers/:id/wallet/adjust', () =>
      HttpResponse.json({ transactionId: 9, wallet: {} }),
    );
    await adjustCustomerWallet(
      DANIEL,
      { amount: '10.0000', direction: 'credit', reason: 'Goodwill credit' },
      'key-1',
    );
    expect(seen[0].method).toBe('POST');
    expect(seen[0].path).toBe(`/admin/customers/${DANIEL}/wallet/adjust`);
    expect(seen[0].body).toEqual({ amount: '10.0000', direction: 'credit', reason: 'Goodwill credit' });
    expect(seen[0].headers.get('Idempotency-Key')).toBe('key-1');
  });

  it('moves the balance, and answers a repeated key with the first adjustment', async () => {
    const body = { amount: '10.0000', direction: 'credit', reason: 'Goodwill credit' } as const;
    const first = await adjustCustomerWallet(DANIEL, body, 'key-replay');
    expect(first.wallet.balance).toBe('60.0000');
    const again = await adjustCustomerWallet(DANIEL, body, 'key-replay');
    expect(again.transactionId).toBe(first.transactionId);
    expect(again.wallet.balance).toBe('60.0000');
    await expect(
      adjustCustomerWallet(DANIEL, { ...body, amount: '11.0000' }, 'key-replay'),
    ).rejects.toMatchObject({ status: 409, code: 'IDEMPOTENCY_KEY_REUSED' });
  });

  it('shows the server’s refusals', async () => {
    const debit = { amount: '500.0000', direction: 'debit', reason: 'Too much' } as const;
    await expect(adjustCustomerWallet(DANIEL, debit, 'key-a')).rejects.toMatchObject({
      code: 'INSUFFICIENT_FUNDS',
    });
    await expect(
      adjustCustomerWallet(
        DANIEL,
        { amount: '9000.0000', direction: 'credit', reason: 'Big credit' },
        'key-b',
      ),
    ).rejects.toMatchObject({ code: 'APPROVAL_REQUIRED' });
    const noAccount = await adjustCustomerWallet(
      SOFIA,
      { amount: '5.0000', direction: 'credit', reason: 'No account' },
      'key-c',
    ).catch((e: unknown) => e as ApiError);
    expect(noAccount).toMatchObject({ code: 'NO_ACCOUNT' });
  });

  it('refuses a write without the key', async () => {
    await expect(
      adjustCustomerWallet(DANIEL, { amount: '1.0000', direction: 'credit', reason: 'No key' }, ''),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('freezes with a reason, then lifts the hold', async () => {
    const seen = recording('post', '*/admin/customers/:id/wallet/freeze', () => HttpResponse.json({}));
    await freezeCustomerWallet(DANIEL, { reason: 'Checking a dispute' }, 'key-f');
    expect(seen[0].body).toEqual({ reason: 'Checking a dispute' });
    expect(seen[0].headers.get('Idempotency-Key')).toBe('key-f');
    mockServer.resetHandlers();
    const frozen = await freezeCustomerWallet(DANIEL, { reason: 'Checking a dispute' }, 'key-f2');
    expect(frozen.frozen).toMatchObject({ reason: 'Checking a dispute' });
    const lifted = await unfreezeCustomerWallet(DANIEL, { reason: 'The dispute was won' }, 'key-u');
    expect(lifted.frozen).toBeNull();
  });
});
