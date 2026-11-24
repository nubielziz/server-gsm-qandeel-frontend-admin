// Tests for the data request functions, run against the dev mock API: the route, method, query and body of each, the account's name on
// every row, the filters (`accountId`, never `customerId`) and the moves of a request with their refusals.
import { beforeEach, describe, expect, it } from 'vitest';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { emptyList, SEED, spy } from '../test/apiSupport';
import { installAccountMocks } from '../test/installAccountMocks';
import { toListQuery } from '../lib/filters';
import { anonymizeAccount, getDataRequest, listDataRequests, updateDataRequest } from '.';
import { HttpResponse } from 'msw';

setupMockApi();
installAccountMocks();
beforeEach(async () => {
  await signInAs();
});

const { MIA } = SEED;

describe('what each function sends', () => {
  it('lists with the filters of the address and the one-row count', async () => {
    const list = spy('get', '/admin/data-requests', emptyList);
    await listDataRequests(
      toListQuery({ status: ['open', 'in_progress'], accountId: MIA }, { start: 0, end: 1 }),
    );
    expect(list[0].path).toBe('/admin/data-requests');
    expect(list[0].params.getAll('status')).toEqual(['open', 'in_progress']);
    expect(list[0].params.get('accountId')).toBe(String(MIA));
    expect(list[0].params.get('_end')).toBe('1');
  });

  it('reads one request and moves it with a note', async () => {
    const one = spy('get', '/admin/data-requests/:id', () => HttpResponse.json({ id: 3 }));
    await getDataRequest(3);
    expect(one[0].path).toBe('/admin/data-requests/3');
    const move = spy('patch', '/admin/data-requests/:id', () => HttpResponse.json({ id: 3 }));
    await updateDataRequest(3, { status: 'rejected', note: 'Duplicate' });
    expect(move[0]).toMatchObject({
      method: 'PATCH',
      path: '/admin/data-requests/3',
      body: { status: 'rejected', note: 'Duplicate' },
    });
  });
});

describe('on the mock server', () => {
  it('lists requests with the account’s name, filtered by status and account', async () => {
    const all = await listDataRequests({});
    expect(all.total).toBe(2);
    expect(all.data.find((request) => request.id === 32)).toMatchObject({
      accountId: MIA,
      accountName: 'Mia Schneider',
      kind: 'erasure',
      status: 'open',
    });
    const pending = await listDataRequests(
      toListQuery({ status: ['open', 'in_progress'] }, { start: 0, end: 1 }),
    );
    expect(pending.total).toBe(1);
    expect((await listDataRequests({ filters: { accountId: MIA } })).total).toBe(1);
    expect((await getDataRequest(31)).kind).toBe('export');
  });

  it('answers the old customerId filter with a 422: the filter is accountId', async () => {
    await expect(listDataRequests({ filters: { customerId: 16 } })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { customerId: expect.any(Array) },
    });
  });

  it('moves a request to in progress and then rejects it, and refuses to change a closed one', async () => {
    expect((await updateDataRequest(32, { status: 'in_progress' })).status).toBe('in_progress');
    expect((await updateDataRequest(32, { status: 'rejected', note: 'Not the account holder' })).status).toBe(
      'rejected',
    );
    await expect(updateDataRequest(32, { status: 'completed' })).rejects.toMatchObject({
      status: 409,
      code: 'REQUEST_CLOSED',
    });
    await expect(getDataRequest(999)).rejects.toMatchObject({ status: 404 });
  });

  it('refuses to mark an erasure done by hand until its account is anonymized, which closes it', async () => {
    await expect(updateDataRequest(32, { status: 'completed' })).rejects.toMatchObject({
      status: 409,
      code: 'ERASURE_NOT_DONE',
    });
    expect((await getDataRequest(32)).status).toBe('open');
    await anonymizeAccount(MIA);
    const closed = await getDataRequest(32);
    expect(closed.status).toBe('completed');
    expect(closed.completedAt).toBeTruthy();
  });
});
