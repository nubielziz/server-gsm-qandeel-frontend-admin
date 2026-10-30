// Tests for the customers API functions, run against the dev mock API (`mockServer`): each one reaches its route with the path,
// method, query and body of its assumed contract (a recording handler checks that), and reads the answer the way the screens do
// (the mock keeps simple state, so an action can be checked by reading the customer again).
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isApiError } from '@/lib/api';
import { mockServer } from '@/mocks/node';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { tabFilters, toListQuery } from '../lib/filters';
import { PENDING_STATUSES } from '../lib/requests';
import { customerState } from '../mocks/store';
import {
  anonymizeCustomer,
  blockCustomer,
  createCustomer,
  createCustomerAccount,
  customersResources,
  exportCustomerData,
  getCustomer,
  getDataRequest,
  listCustomers,
  listDataRequests,
  reactivateCustomer,
  revokeCustomerSessions,
  setCustomerPassword,
  suspendCustomer,
  updateCustomer,
  updateDataRequest,
} from '.';

setupMockApi();
// Every test starts signed in as Rami, the Owner.
beforeEach(async () => {
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

// Customers of the mock seed (taken from the demo; see mocks/store.ts).
const DANIEL = 1; // an account, one session, 4 orders (one rejected)
const SOFIA = 2; // a guest who has not ordered
const MIA = 16; // a guest with an open erasure request (DSR-32)
const HANNAH = 18; // an account, suspended
const JACK = 19; // a guest, blocked

type Seen = { method: string; path: string; params: URLSearchParams; body: unknown };

/** Records the requests a route gets (method, path, query and JSON body), then answers with `reply`. */
function recording(method: 'get' | 'post' | 'patch', pattern: string, reply: () => Response): Seen[] {
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
      });
      return reply();
    }),
  );
  return seen;
}

const noContent = () => new HttpResponse(null, { status: 204 });

describe('what each function sends', () => {
  it('lists customers with the simple-rest query: range, sort, text and field filters', async () => {
    const seen = recording('get', '*/admin/customers', () =>
      HttpResponse.json([], { headers: { 'x-total-count': '0' } }),
    );
    await listCustomers(
      toListQuery(
        { q: 'ann', country: 'GB', hasAccount: true, ...tabFilters('flagged') },
        { start: 25, end: 50, sort: ['totalSpent'], order: ['desc'] },
      ),
    );
    expect(seen[0].path).toBe('/admin/customers');
    const params = seen[0].params;
    expect(params.get('_start')).toBe('25');
    expect(params.get('_end')).toBe('50');
    expect(params.get('_sort')).toBe('totalSpent');
    expect(params.get('_order')).toBe('desc');
    expect(params.get('q')).toBe('ann');
    expect(params.get('country')).toBe('GB');
    expect(params.get('hasAccount')).toBe('true');
    expect(params.getAll('riskLevel')).toEqual(['medium', 'high']);
  });

  it('reads one customer, creates one and edits one', async () => {
    const one = recording('get', '*/admin/customers/:id', () => HttpResponse.json({ id: 7 }));
    await getCustomer(7);
    expect(one[0]).toMatchObject({ method: 'GET', path: '/admin/customers/7' });

    const create = recording('post', '*/admin/customers', () =>
      HttpResponse.json({ id: 8 }, { status: 201 }),
    );
    const body = {
      name: 'Pat Example',
      email: 'pat@mail.example',
      country: 'DE',
      locale: 'en',
      phone: '+49 1',
      password: { mode: 'reset_link' as const },
    };
    await createCustomer(body);
    expect(create[0]).toMatchObject({ method: 'POST', path: '/admin/customers', body });

    const edit = recording('patch', '*/admin/customers/:id', () => HttpResponse.json({ id: 7 }));
    await updateCustomer(7, { name: 'Pat E.', internalNotes: 'VIP' });
    expect(edit[0]).toMatchObject({
      method: 'PATCH',
      path: '/admin/customers/7',
      body: { name: 'Pat E.', internalNotes: 'VIP' },
    });
  });

  it('sends each account action to its own route with its own body', async () => {
    const calls = {
      account: recording('post', '*/admin/customers/:id/account', () => HttpResponse.json({})),
      password: recording('post', '*/admin/customers/:id/password', () => HttpResponse.json({})),
      revoke: recording('post', '*/admin/customers/:id/sessions/revoke', noContent),
      suspend: recording('post', '*/admin/customers/:id/suspend', noContent),
      reactivate: recording('post', '*/admin/customers/:id/reactivate', noContent),
      block: recording('post', '*/admin/customers/:id/block', noContent),
      anonymize: recording('post', '*/admin/customers/:id/anonymize', noContent),
    };
    await createCustomerAccount(5, { mode: 'temporary_password' });
    await setCustomerPassword(5, { mode: 'reset_link', revokeSessions: true });
    await revokeCustomerSessions(5);
    await suspendCustomer(5, { reason: 'Other', note: 'asked by phone' });
    await reactivateCustomer(5);
    await blockCustomer(5, { blocked: true, reason: 'Card testing or fraud' });
    await blockCustomer(5, { blocked: false });
    await anonymizeCustomer(5);

    expect(calls.account[0]).toMatchObject({
      path: '/admin/customers/5/account',
      body: { mode: 'temporary_password' },
    });
    expect(calls.password[0]).toMatchObject({
      path: '/admin/customers/5/password',
      body: { mode: 'reset_link', revokeSessions: true },
    });
    expect(calls.revoke[0]).toMatchObject({ path: '/admin/customers/5/sessions/revoke', body: undefined });
    expect(calls.suspend[0]).toMatchObject({
      path: '/admin/customers/5/suspend',
      body: { reason: 'Other', note: 'asked by phone' },
    });
    expect(calls.reactivate[0]).toMatchObject({ path: '/admin/customers/5/reactivate', body: undefined });
    expect(calls.block.map((call) => call.body)).toEqual([
      { blocked: true, reason: 'Card testing or fraud' },
      { blocked: false },
    ]);
    expect(calls.block[0].path).toBe('/admin/customers/5/block');
    expect(calls.anonymize[0]).toMatchObject({ method: 'POST', path: '/admin/customers/5/anonymize' });
  });

  it('downloads the export as a file named by the server, or customer-<id>.json', async () => {
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: () => 'blob:test', revokeObjectURL: vi.fn() }),
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const plain = recording('get', '*/admin/customers/:id/export', () => new HttpResponse('{}'));
    expect(await exportCustomerData(7)).toBe('customer-7.json');
    expect(plain[0]).toMatchObject({ method: 'GET', path: '/admin/customers/7/export' });
    mockServer.use(
      http.get(
        '*/admin/customers/:id/export',
        () =>
          new HttpResponse('{}', {
            headers: { 'Content-Disposition': 'attachment; filename="export-7.json"' },
          }),
      ),
    );
    expect(await exportCustomerData(7)).toBe('export-7.json');
  });

  it('reads and moves data requests', async () => {
    const list = recording('get', '*/admin/data-requests', () =>
      HttpResponse.json([], { headers: { 'x-total-count': '0' } }),
    );
    await listDataRequests(toListQuery({ status: PENDING_STATUSES, customerId: 16 }, { start: 0, end: 1 }));
    expect(list[0].path).toBe('/admin/data-requests');
    expect(list[0].params.getAll('status')).toEqual(['open', 'in_progress']);
    expect(list[0].params.get('customerId')).toBe('16');

    const one = recording('get', '*/admin/data-requests/:id', () => HttpResponse.json({ id: 3 }));
    await getDataRequest(3);
    expect(one[0].path).toBe('/admin/data-requests/3');

    const move = recording('patch', '*/admin/data-requests/:id', () => HttpResponse.json({ id: 3 }));
    await updateDataRequest(3, { status: 'rejected', note: 'Duplicate' });
    expect(move[0]).toMatchObject({
      method: 'PATCH',
      path: '/admin/data-requests/3',
      body: { status: 'rejected', note: 'Duplicate' },
    });
  });

  it('registers the two Refine resources with only the operations their routes offer', () => {
    expect(Object.keys(customersResources)).toEqual(['customers', 'data-requests']);
    expect(Object.keys(customersResources.customers).sort()).toEqual(['create', 'list', 'show', 'update']);
    expect(Object.keys(customersResources['data-requests']).sort()).toEqual(['list', 'show', 'update']);
  });
});

describe('listing customers', () => {
  const total = async (filters: Parameters<typeof toListQuery>[0]) =>
    (await listCustomers(toListQuery(filters, { start: 0, end: 1 }))).total;

  it('counts every tab with a one-row call and reads the total from the header', async () => {
    expect(await total(tabFilters('all'))).toBe(30);
    expect(await total(tabFilters('active'))).toBe(28);
    expect(await total(tabFilters('flagged'))).toBe(3);
    expect(await total(tabFilters('suspended'))).toBe(1);
    expect(await total(tabFilters('blocked'))).toBe(1);
    expect(await total({ hasAccount: true })).toBe(10);
  });

  it('puts the order figures on each row, from the orders the customer placed', async () => {
    const { data } = await listCustomers({ filters: { country: 'GB' }, sort: ['name'], order: ['asc'] });
    const daniel = data.find((row) => row.id === DANIEL);
    expect(daniel).toMatchObject({
      name: 'Daniel Whitmore',
      status: 'active',
      riskLevel: 'low',
      hasAccount: true,
      currencyCode: 'GBP',
      ordersCount: 4,
      totalSpent: '38.3700',
    });
    expect(daniel?.lastOrderAt).toBeTruthy();
    // A customer who never ordered has no last order.
    const { data: sofia } = await listCustomers({ filters: { country: 'ES' } });
    expect(sofia.find((row) => row.id === SOFIA)).toMatchObject({
      ordersCount: 0,
      lastOrderAt: null,
      totalSpent: '0.0000',
    });
  });

  it('writes the demo’s "med" risk as "medium"', async () => {
    const { data } = await listCustomers(toListQuery(tabFilters('flagged')));
    expect(data.map((row) => row.riskLevel).sort()).toEqual(['high', 'medium', 'medium']);
  });

  it('pages, sorts by spend and searches name and email on the server', async () => {
    const page = await listCustomers({ start: 0, end: 3, sort: ['totalSpent'], order: ['desc'] });
    expect(page.total).toBe(30);
    const spend = page.data.map((row) => Number(row.totalSpent));
    expect(spend).toEqual([...spend].sort((a, b) => b - a));
    expect((await listCustomers({ q: 'WHITMORE' })).data.map((row) => row.id)).toEqual([DANIEL]);
    expect((await listCustomers({ q: 'sofia.alvarez@' })).data.map((row) => row.id)).toEqual([SOFIA]);
  });
});

describe('reading one customer', () => {
  it('gives an account its figures, session address, consent records and risk summary', async () => {
    const daniel = await getCustomer(DANIEL);
    expect(daniel.stats).toMatchObject({ orders: 4, spent: '38.3700', refunds: 1, tickets: 0, disputes: 1 });
    expect(daniel.account).toMatchObject({ emailVerified: true, activeSessions: 1, lastIp: '203.0.113.177' });
    expect(daniel.latestConsents?.records.map((record) => record.purpose)).toEqual([
      'terms',
      'privacy',
      'refund_policy',
      'withdrawal_waiver',
    ]);
    expect(daniel.latestConsents?.records[0].document).toBe('Terms of service v3.2');
    expect(daniel.risk.highestScore).toBe(24);
    expect(daniel.risk.signals).toEqual([]);
  });

  it('gives a guest no account, and a customer with no orders no consent records', async () => {
    const sofia = await getCustomer(SOFIA);
    expect(sofia.account).toBeNull();
    expect(sofia.latestConsents).toBeNull();
    expect(sofia.risk).toEqual({ highestScore: null, signals: [] });
    expect(sofia.stats).toMatchObject({ orders: 0, spent: '0.0000', lastOrderAt: null });
  });

  it('lists the risk signals with the order each was seen on', async () => {
    const jack = await getCustomer(JACK);
    expect(jack.risk.highestScore).toBe(71);
    expect(jack.risk.signals).toEqual([
      { text: 'Email on a previous chargeback', orderId: 20400 },
      { text: 'Disposable email domain', orderId: 20400 },
    ]);
  });

  it('answers 404 for a customer that does not exist', async () => {
    const error = await getCustomer(9999).catch((caught: unknown) => caught);
    expect(isApiError(error) && error.status).toBe(404);
    expect(isApiError(error) && error.code).toBe('NOT_FOUND');
  });
});

describe('creating and editing', () => {
  const body = {
    name: 'Pat Example',
    email: 'pat@mail.example',
    country: 'DE',
    locale: 'en',
    password: { mode: 'reset_link' as const },
  };

  it('adds a customer with an account and a link, and counts them', async () => {
    const created = await createCustomer(body);
    expect(created).toMatchObject({
      id: 31,
      name: 'Pat Example',
      hasAccount: true,
      status: 'active',
      riskLevel: 'low',
    });
    expect(created).not.toHaveProperty('temporaryPassword');
    const detail = await getCustomer(31);
    expect(detail.account).toMatchObject({ emailVerified: false, mustChangePassword: false });
    expect(detail.account?.resetSentAt).toBeTruthy();
    expect((await listCustomers({ start: 0, end: 1 })).total).toBe(31);
  });

  it('returns a temporary password once, only for that mode', async () => {
    const created = await createCustomer({ ...body, password: { mode: 'temporary_password' } });
    expect(created.temporaryPassword).toMatch(/^[A-Za-z0-9]{14}$/);
    expect(await getCustomer(created.id)).not.toHaveProperty('temporaryPassword');
    expect((await getCustomer(created.id)).account).toMatchObject({ mustChangePassword: true });
  });

  it('refuses an address another customer uses with EMAIL_TAKEN, and bad input with field errors', async () => {
    const taken = await createCustomer({ ...body, email: 'Daniel.Whitmore@mail.example' }).catch(
      (caught: unknown) => caught,
    );
    expect(isApiError(taken) && [taken.status, taken.code]).toEqual([409, 'EMAIL_TAKEN']);
    const bad = await createCustomer({ ...body, name: 'P', email: 'nope' }).catch(
      (caught: unknown) => caught,
    );
    expect(isApiError(bad) && bad.status).toBe(422);
    expect(isApiError(bad) && Object.keys(bad.fieldErrors).sort()).toEqual(['email', 'name']);
  });

  it('edits the fields it is given, and a new email cancels the verification', async () => {
    const updated = await updateCustomer(DANIEL, {
      name: 'Dan Whitmore',
      email: 'dan@mail.example',
      country: 'IE',
      internalNotes: 'VIP',
    });
    expect(updated).toMatchObject({
      name: 'Dan Whitmore',
      email: 'dan@mail.example',
      country: 'IE',
      currencyCode: 'EUR',
      internalNotes: 'VIP',
    });
    expect((await getCustomer(DANIEL)).account?.emailVerified).toBe(false);
  });

  it('refuses an email another customer uses when editing', async () => {
    const error = await updateCustomer(DANIEL, { email: 'sofia.alvarez@inbox.example' }).catch(
      (caught: unknown) => caught,
    );
    expect(isApiError(error) && error.code).toBe('EMAIL_TAKEN');
  });
});

describe('account actions', () => {
  it('suspends with a reason and a note, signs them out, and reactivates', async () => {
    await suspendCustomer(DANIEL, { reason: 'Account may be compromised', note: 'phone lost' });
    const suspended = await getCustomer(DANIEL);
    expect(suspended).toMatchObject({
      status: 'suspended',
      suspendedReason: 'Account may be compromised: phone lost',
    });
    expect(suspended.account?.activeSessions).toBe(0);
    await reactivateCustomer(DANIEL);
    expect(await getCustomer(DANIEL)).toMatchObject({ status: 'active', suspendedReason: null });
  });

  it('refuses a suspension without a reason, and for a customer who is not active', async () => {
    const none = await suspendCustomer(DANIEL, { reason: '' }).catch((caught: unknown) => caught);
    expect(isApiError(none) && none.status).toBe(422);
    const again = await suspendCustomer(HANNAH, { reason: 'Other' }).catch((caught: unknown) => caught);
    expect(isApiError(again) && again.status).toBe(409);
  });

  it('blocks as high risk with the reason as a note, and lifts the block', async () => {
    await blockCustomer(DANIEL, { blocked: true, reason: 'Abuse of refunds' });
    expect(await getCustomer(DANIEL)).toMatchObject({
      status: 'blocked',
      riskLevel: 'high',
      internalNotes: 'Abuse of refunds',
    });
    await blockCustomer(DANIEL, { blocked: false });
    expect(await getCustomer(DANIEL)).toMatchObject({ status: 'active', riskLevel: 'medium' });
    const error = await blockCustomer(DANIEL, { blocked: false }).catch((caught: unknown) => caught);
    expect(isApiError(error) && error.status).toBe(409);
  });

  it('gives a guest an account, and sets or resets a password with or without ending the sessions', async () => {
    const link = await createCustomerAccount(SOFIA, { mode: 'reset_link' });
    expect(link.temporaryPassword).toBeUndefined();
    expect((await getCustomer(SOFIA)).account).toMatchObject({ mustChangePassword: false });

    const temporary = await setCustomerPassword(DANIEL, {
      mode: 'temporary_password',
      revokeSessions: false,
    });
    expect(temporary.temporaryPassword).toMatch(/^[A-Za-z0-9]{14}$/);
    expect((await getCustomer(DANIEL)).account).toMatchObject({
      mustChangePassword: true,
      activeSessions: 1,
    });
    await setCustomerPassword(DANIEL, { mode: 'reset_link', revokeSessions: true });
    expect((await getCustomer(DANIEL)).account?.activeSessions).toBe(0);
  });

  it('refuses an account for someone who has one, and a password for a guest', async () => {
    const has = await createCustomerAccount(DANIEL, { mode: 'reset_link' }).catch(
      (caught: unknown) => caught,
    );
    expect(isApiError(has) && has.code).toBe('ACCOUNT_EXISTS');
    const guest = await setCustomerPassword(SOFIA, { mode: 'reset_link', revokeSessions: false }).catch(
      (caught: unknown) => caught,
    );
    expect(isApiError(guest) && guest.code).toBe('NO_ACCOUNT');
  });

  it('ends every session', async () => {
    await revokeCustomerSessions(DANIEL);
    expect((await getCustomer(DANIEL)).account?.activeSessions).toBe(0);
  });
});

describe('privacy actions and data requests', () => {
  it('exports the data and closes the customer’s open export request, but not their erasure request', async () => {
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: () => 'blob:test', revokeObjectURL: vi.fn() }),
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    // The storefront makes requests, so the test adds one to the mock store.
    (await customerState()).requests.insert({
      customerId: MIA,
      kind: 'export',
      status: 'open',
      requestedAt: new Date().toISOString(),
      dueAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      completedAt: null,
      handledBy: null,
      fileId: null,
      createdAt: new Date().toISOString(),
    });
    await exportCustomerData(MIA);
    const requests = (await listDataRequests({ filters: { customerId: MIA } })).data;
    expect(requests.map((request) => `${request.kind}:${request.status}`).sort()).toEqual([
      'erasure:open',
      'export:completed',
    ]);
  });

  it('anonymises: name, email and notes go, the account goes, and the open erasure request is closed', async () => {
    await anonymizeCustomer(MIA);
    expect(await getCustomer(MIA)).toMatchObject({
      name: 'Deleted customer',
      email: `deleted-${MIA}@redacted.invalid`,
      status: 'anonymized',
      hasAccount: false,
      marketingOptIn: false,
    });
    const request = (await listDataRequests({ filters: { customerId: MIA } })).data[0];
    expect(request).toMatchObject({ status: 'completed', customerName: 'Deleted customer' });
    expect(request.completedAt).toBeTruthy();
    const error = await anonymizeCustomer(MIA).catch((caught: unknown) => caught);
    expect(isApiError(error) && error.code).toBe('ANONYMIZED');
  });

  it('cuts the IMEIs of an anonymised customer’s orders and replaces the buyer’s name on them', async () => {
    const { listOrders } = await import('@/features/orders');
    const before = await listOrders({ filters: { customerId: DANIEL } });
    expect(before.data[0].customer?.name).toBe('Daniel Whitmore');
    await anonymizeCustomer(DANIEL);
    const after = await listOrders({ filters: { customerId: DANIEL } });
    expect(after.data).toHaveLength(4);
    expect(after.data.every((order) => order.customer?.name === 'Deleted customer')).toBe(true);
    expect(after.data.every((order) => order.imei.endsWith('•••••••'))).toBe(true);
  });

  it('lists requests with the customer’s name, filtered by status and customer', async () => {
    const all = await listDataRequests({});
    expect(all.total).toBe(2);
    expect(all.data.find((request) => request.id === 32)).toMatchObject({
      customerId: MIA,
      customerName: 'Mia Schneider',
      kind: 'erasure',
      status: 'open',
    });
    const pending = await listDataRequests(toListQuery({ status: PENDING_STATUSES }, { start: 0, end: 1 }));
    expect(pending.total).toBe(1);
    expect((await getDataRequest(31)).kind).toBe('export');
  });

  it('moves a request to in progress and then done, and refuses to change a closed one', async () => {
    expect((await updateDataRequest(32, { status: 'in_progress' })).status).toBe('in_progress');
    const done = await updateDataRequest(32, { status: 'completed' });
    expect(done.status).toBe('completed');
    expect(done.completedAt).toBeTruthy();
    const error = await updateDataRequest(32, { status: 'rejected', note: 'late' }).catch(
      (caught: unknown) => caught,
    );
    expect(isApiError(error) && error.code).toBe('REQUEST_CLOSED');
    const unknown = await getDataRequest(999).catch((caught: unknown) => caught);
    expect(isApiError(unknown) && unknown.status).toBe(404);
  });
});
