// Tests for the merchant account, wallet and API key functions, run against the dev mock API (`mockServer`): each reaches its route
// with the query or body of its assumed contract and reads the answer the way the screens do. The mock keeps simple state, so an
// action can be checked by reading the merchant, its wallet or its statement again.
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { mockServer } from '@/mocks/node';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { installMerchantMocks } from '../test/installMerchantMocks';
import {
  adjustClientWallet,
  createClient,
  downloadClientStatement,
  getClient,
  getClientWallet,
  listClientApiKeys,
  listClients,
  listClientStatement,
  revokeApiKey,
  setClientCreditLimit,
  updateClient,
} from '.';

setupMockApi();
installMerchantMocks();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// Merchants of the mock seed (taken from the demo; see mocks/seed.ts).
const ZAIN = 1; // VIP, active, $1,209.75 in the wallet, $71.23 held, a $2,000 credit limit, three API keys
const PENDING = 18; // Algiers Service Plus, waiting for approval
const EMPTY_WALLET = 20; // Accra Devices, pending, nothing in the wallet and a $300 credit limit

// Answers a route itself and records how it was called, for the checks that are about the request.
type Seen = { method: string; path: string; params: URLSearchParams; body: unknown };
function spy(method: 'get' | 'post' | 'patch' | 'delete', path: string, answer: () => Response): Seen[] {
  const seen: Seen[] = [];
  mockServer.use(
    http[method](`*${path}`, async ({ request }) => {
      const url = new URL(request.url);
      const text = await request.text();
      seen.push({
        method: request.method,
        path: url.pathname,
        params: url.searchParams,
        body: text ? JSON.parse(text) : undefined,
      });
      return answer();
    }),
  );
  return seen;
}

describe('listClients', () => {
  it('counts every status with a one-row call and reads the total from the header', async () => {
    const total = async (status?: 'active' | 'pending' | 'suspended') =>
      (await listClients({ start: 0, end: 1, filters: status ? { status } : undefined })).total;
    expect([await total(), await total('active'), await total('pending'), await total('suspended')]).toEqual([
      20, 17, 2, 1,
    ]);
  });

  it('sends the paging, sorting, search and filters in the simple-rest dialect', async () => {
    const seen = spy('get', '/admin/clients', () =>
      HttpResponse.json([], { headers: { 'x-total-count': '0' } }),
    );
    await listClients({
      start: 25,
      end: 50,
      sort: ['name'],
      order: ['desc'],
      q: 'zain',
      filters: { status: 'active', groupId: 3 },
    });
    expect(seen[0].path).toBe('/admin/clients');
    expect(Object.fromEntries(seen[0].params)).toEqual({
      _start: '25',
      _end: '50',
      _sort: 'name',
      _order: 'desc',
      q: 'zain',
      status: 'active',
      groupId: '3',
    });
  });

  it('filters by status and group and searches by name, email and country on the mock server', async () => {
    const vip = await listClients({ filters: { groupId: 3 } });
    expect(vip.data.map((client) => client.name)).toEqual([
      'Zain Mobile Hub',
      'Phone Doctor FZE',
      'Cairo GSM Lab',
    ]);
    expect((await listClients({ q: 'karachi' })).data.map((client) => client.name)).toEqual([
      'Karachi Unlock Hub',
    ]);
    expect((await listClients({ q: 'ZAINMOBILEHUB' })).total).toBe(1);
    const sorted = await listClients({ start: 0, end: 2, sort: ['name'], order: ['asc'] });
    expect(sorted.data.map((client) => client.name)).toEqual(['Accra Devices', 'Al-Noor Telecom']);
  });

  it('carries the joined group and referrer, the wallet and the 30-day figures', async () => {
    const { data } = await listClients({ q: 'Zain' });
    expect(data[0]).toMatchObject({
      id: ZAIN,
      status: 'active',
      country: 'JO',
      group: { id: 3, name: 'VIP', discountPercent: '8.0000' },
      referredBy: null,
      wallet: { balance: '1209.7500', reserved: '71.2300', creditLimit: '2000.0000', available: '3209.7500' },
    });
    expect(data[0].stats?.orders).toBeGreaterThan(0);
    const referred = await getClient(8);
    expect(referred.referredBy).toEqual({ id: 1, name: 'Zain Mobile Hub' });
  });
});

describe('getClient', () => {
  it('reads one merchant', async () => {
    expect(await getClient(PENDING)).toMatchObject({
      name: 'Algiers Service Plus',
      status: 'pending',
      kycStatus: 'pending',
    });
  });

  it('turns a missing merchant into the server’s 404', async () => {
    await expect(getClient(9999)).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});

describe('createClient', () => {
  const body = {
    name: 'Muscat Gadgets',
    email: 'Hello@Muscat.example',
    country: 'OM',
    groupId: 2,
    invite: true,
  } as const;

  it('sends the invitation as it is and gets a pending merchant back', async () => {
    const seen = spy('post', '/admin/clients', () =>
      HttpResponse.json({ id: 99, name: 'Muscat Gadgets', status: 'pending' }, { status: 201 }),
    );
    await createClient({ ...body, creditLimit: '500.0000' });
    expect(seen[0]).toMatchObject({ method: 'POST', body: { ...body, creditLimit: '500.0000' } });
  });

  it('adds the merchant to the list as pending, in the group asked for', async () => {
    const created = await createClient({ ...body });
    expect(created).toMatchObject({
      status: 'pending',
      kycStatus: 'none',
      email: 'hello@muscat.example',
      country: 'OM',
    });
    expect(created.group?.name).toBe('Wholesale');
    expect((await listClients({ filters: { status: 'pending' } })).total).toBe(3);
  });

  it('refuses an email that already has an account with the server’s EMAIL_TAKEN', async () => {
    const error = await createClient({ ...body, email: 'ops@zainmobilehub.example' }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'EMAIL_TAKEN' });
  });

  it('answers a bad form with a message per field', async () => {
    const error = (await createClient({ name: '', email: 'nope', country: 'X', invite: true }).catch(
      (e: unknown) => e,
    )) as ApiError;
    expect(Object.keys(error.fieldErrors).sort()).toEqual(['country', 'email', 'name']);
  });
});

describe('updateClient', () => {
  it('sends only what changes and the mock applies it', async () => {
    const seen = spy('patch', `/admin/clients/${PENDING}`, () => HttpResponse.json({ id: PENDING }));
    await updateClient(PENDING, { status: 'active' });
    expect(seen[0]).toMatchObject({
      method: 'PATCH',
      path: `/admin/clients/${PENDING}`,
      body: { status: 'active' },
    });
  });

  it('approves, suspends with a reason and moves a merchant to another group', async () => {
    expect((await updateClient(PENDING, { status: 'active' })).status).toBe('active');
    expect((await updateClient(ZAIN, { status: 'suspended', reason: 'Chargeback dispute' })).status).toBe(
      'suspended',
    );
    const moved = await updateClient(ZAIN, { groupId: 2 });
    expect(moved.group).toMatchObject({ id: 2, name: 'Wholesale' });
    expect((await getClient(ZAIN)).groupId).toBe(2);
  });

  it('refuses a group that does not exist', async () => {
    await expect(updateClient(ZAIN, { groupId: 99 })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { groupId: ['That group does not exist.'] },
    });
  });
});

describe('wallet', () => {
  it('reads the four figures as the server reports them', async () => {
    expect(await getClientWallet(ZAIN)).toEqual({
      balance: '1209.7500',
      reserved: '71.2300',
      creditLimit: '2000.0000',
      available: '3209.7500',
    });
  });

  it('reads the statement newest first, each line with its running balance, down to the wallet balance', async () => {
    const page = await listClientStatement(ZAIN, { start: 0, end: 5, sort: ['createdAt'], order: ['desc'] });
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

  it('posts an adjustment, shows it as the newest line and moves the balance', async () => {
    const result = await adjustClientWallet(EMPTY_WALLET, {
      amount: '25.0000',
      direction: 'credit',
      reason: 'Refund for duplicate charge',
    });
    expect(result.wallet).toMatchObject({ balance: '25.0000', available: '325.0000' });
    expect(result.transactionId).toBeGreaterThan(0);
    const [newest] = (
      await listClientStatement(EMPTY_WALLET, { start: 0, end: 1, sort: ['createdAt'], order: ['desc'] })
    ).data;
    expect(newest).toMatchObject({
      transactionId: result.transactionId,
      kind: 'adjustment',
      memo: 'Manual credit: Refund for duplicate charge',
      amount: '25.0000',
      balanceAfter: '25.0000',
    });
  });

  it('sends the amount, direction and reason as typed in the dialog', async () => {
    const seen = spy('post', `/admin/clients/${ZAIN}/wallet/adjust`, () =>
      HttpResponse.json({ transactionId: 1, wallet: {} }),
    );
    await adjustClientWallet(ZAIN, { amount: '10.0000', direction: 'debit', reason: 'Duplicate top-up' });
    expect(seen[0].body).toEqual({ amount: '10.0000', direction: 'debit', reason: 'Duplicate top-up' });
  });

  it('shows the server’s refusals: past the credit limit, and over the approval limit', async () => {
    const past = await adjustClientWallet(ZAIN, {
      amount: '9000.0000',
      direction: 'debit',
      reason: 'Too much',
    }).catch((e: unknown) => e);
    expect(past).toMatchObject({ status: 409, code: 'CREDIT_LIMIT_EXCEEDED' });
    expect((past as ApiError).detail).toBe('This would take the wallet below the credit limit (-$2,000.00).');
    await expect(
      adjustClientWallet(ZAIN, { amount: '10001.0000', direction: 'credit', reason: 'Big credit' }),
    ).rejects.toMatchObject({ status: 409, code: 'APPROVAL_REQUIRED' });
    expect((await getClientWallet(ZAIN)).balance).toBe('1209.7500');
  });

  it('sets the credit limit and the wallet follows', async () => {
    const seen = spy('patch', `/admin/clients/${ZAIN}/credit-limit`, () => HttpResponse.json({}));
    await setClientCreditLimit(ZAIN, { creditLimit: '3000.0000' });
    expect(seen[0]).toMatchObject({ method: 'PATCH', body: { creditLimit: '3000.0000' } });
  });

  it('keeps the new credit limit on the mock server', async () => {
    const wallet = await setClientCreditLimit(ZAIN, { creditLimit: '3000.0000' });
    expect(wallet).toMatchObject({ creditLimit: '3000.0000', available: '4209.7500' });
    expect((await getClient(ZAIN)).wallet?.creditLimit).toBe('3000.0000');
  });

  it('downloads the official statement as a file named by the server', async () => {
    const created: Blob[] = [];
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: (blob: Blob) => (created.push(blob), 'blob:test'),
        revokeObjectURL: vi.fn(),
      }),
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    expect(await downloadClientStatement(ZAIN)).toBe('statement-1-mock.pdf');
    expect(created).toHaveLength(1);
    await expect(downloadClientStatement(9999)).rejects.toMatchObject({ status: 404 });
  });

  it('falls back to a name of its own when the server names no file', async () => {
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: () => 'blob:test', revokeObjectURL: vi.fn() }),
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    mockServer.use(http.get('*/admin/reports/client-statement/:clientId', () => new HttpResponse('pdf')));
    expect(await downloadClientStatement(ZAIN)).toBe('statement-1.pdf');
  });
});

describe('API keys', () => {
  it('lists the keys of a merchant without their secrets, newest first', async () => {
    const keys = await listClientApiKeys(ZAIN);
    expect(keys.map((key) => key.name)).toEqual(['Legacy integration', 'Staging', 'Production']);
    expect(keys[2]).toMatchObject({ prefix: 'gsm_live_69xx', allowedIps: ['203.0.113.55'], revokedAt: null });
    expect(keys[0].revokedAt).not.toBeNull();
    expect(Object.keys(keys[2])).not.toContain('secret');
    expect(await listClientApiKeys(PENDING)).toEqual([]);
  });

  it('revokes a key, and refuses a second revoke', async () => {
    const [, , production] = await listClientApiKeys(ZAIN);
    await revokeApiKey(production.id);
    expect((await listClientApiKeys(ZAIN)).find((key) => key.id === production.id)?.revokedAt).not.toBeNull();
    await expect(revokeApiKey(production.id)).rejects.toMatchObject({ status: 409, code: 'ALREADY_REVOKED' });
    await expect(revokeApiKey(9999)).rejects.toMatchObject({ status: 404 });
  });

  it('uses the key route of the map', async () => {
    const seen = spy('delete', '/admin/api-keys/7', () => new HttpResponse(null, { status: 204 }));
    await revokeApiKey(7);
    expect(seen[0]).toMatchObject({ method: 'DELETE', path: '/admin/api-keys/7' });
  });
});
