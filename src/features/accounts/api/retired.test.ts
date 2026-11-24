// Tests for what stays of the old customer routes and what the accounts feature registers: every `/admin/customers*` row answers 410
// `ROUTE_RETIRED`, the Refine registry lists only the operations each route offers, and one account's payments are read
// through the finance list with the buyer filter `accountId`.
import { HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { emptyList, SEED, spy } from '../test/apiSupport';
import { installAccountMocks } from '../test/installAccountMocks';
import { accountsResources, listAccountPayments } from '.';

setupMockApi();
installAccountMocks();
beforeEach(async () => {
  await signInAs();
});

describe('the retired customer routes', () => {
  it('answer 410 ROUTE_RETIRED, whatever the method and the path', async () => {
    for (const call of [
      () => apiGet('/admin/customers'),
      () => apiGet('/admin/customers/5'),
      () => apiPatch('/admin/customers/5', { name: 'x' }),
      () => apiPost('/admin/customers/5/suspend', { reason: 'x' }),
      () => apiGet('/admin/customers/5/wallet'),
      () => apiPost('/admin/customers/5/wallet/adjust', {}),
    ]) {
      await expect(call()).rejects.toMatchObject({ status: 410, code: 'ROUTE_RETIRED' });
    }
  });
});

describe('accountsResources', () => {
  it('registers the four Refine resources with only the operations their routes offer', () => {
    expect(Object.keys(accountsResources)).toEqual([
      'clients',
      'client-groups',
      'client-prices',
      'data-requests',
    ]);
    expect(Object.keys(accountsResources.clients).sort()).toEqual(['create', 'list', 'show', 'update']);
    expect(Object.keys(accountsResources['client-groups']).sort()).toEqual([
      'create',
      'delete',
      'list',
      'show',
      'update',
    ]);
    expect(Object.keys(accountsResources['client-prices']).sort()).toEqual([
      'create',
      'delete',
      'list',
      'update',
    ]);
    expect(Object.keys(accountsResources['data-requests']).sort()).toEqual(['list', 'show', 'update']);
  });
});

describe('listAccountPayments', () => {
  it('reads the finance list filtered by accountId, never customerId', async () => {
    const seen = spy('get', '/admin/payments', emptyList);
    await listAccountPayments(SEED.DANIEL, { start: 0, end: 10, sort: ['createdAt'], order: ['desc'] });
    expect(seen[0].path).toBe('/admin/payments');
    expect(seen[0].params.get('accountId')).toBe(String(SEED.DANIEL));
    expect(seen[0].params.has('customerId')).toBe(false);
    expect(seen[0].params.get('_sort')).toBe('createdAt');
  });

  it('keeps the other filters of the caller', async () => {
    const seen = spy('get', '/admin/payments', () =>
      HttpResponse.json([], { headers: { 'x-total-count': '0' } }),
    );
    await listAccountPayments(7, { filters: { purpose: 'topup' } });
    expect(Object.fromEntries(seen[0].params)).toMatchObject({ accountId: '7', purpose: 'topup' });
  });
});
