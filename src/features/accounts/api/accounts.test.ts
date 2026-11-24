// Tests for the account functions (list, counts, record, create, edit, make an account, legacy lookup), run against the dev mock API
// (`mockServer`): each reaches its route with the query or body of its assumed contract and reads the answer the way the screens do. The
// mock keeps simple state, so an action can be checked by reading the account again. Ports the cases of the merchants and customers tests.
import { HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { listOrders } from '@/features/orders';
import { emptyList, SEED, spy } from '../test/apiSupport';
import { installAccountMocks } from '../test/installAccountMocks';
import {
  anonymizeAccount,
  createAccount,
  findLegacyAccount,
  getAccount,
  getAccountCounts,
  listAccounts,
  makeAccount,
  updateAccount,
} from '.';

setupMockApi();
installAccountMocks();
beforeEach(async () => {
  await signInAs();
});

const { ZAIN, INVITED, FORMER_PENDING, SUSPENDED_MERCHANT, DANIEL, SOFIA, HANNAH } = SEED;

describe('listAccounts', () => {
  it('sends the paging, sorting, search and filters in the simple-rest dialect', async () => {
    const seen = spy('get', '/admin/clients', emptyList);
    await listAccounts({
      start: 25,
      end: 50,
      sort: ['name'],
      order: ['desc'],
      q: 'zain',
      filters: {
        status: ['active', 'suspended'],
        rankId: 3,
        rankKind: 'merchant',
        hasAccount: true,
        country: 'JO',
      },
    });
    expect(seen[0].path).toBe('/admin/clients');
    expect(seen[0].params.getAll('status')).toEqual(['active', 'suspended']);
    expect(Object.fromEntries(seen[0].params)).toMatchObject({
      _start: '25',
      _end: '50',
      _sort: 'name',
      _order: 'desc',
      q: 'zain',
      rankId: '3',
      rankKind: 'merchant',
      hasAccount: 'true',
      country: 'JO',
    });
  });

  it('lists every account when no rank kind is asked for, merchants and shop accounts together', async () => {
    const all = await listAccounts({ start: 0, end: 1 });
    expect(all.total).toBe(51);
    expect((await listAccounts({ start: 0, end: 1, filters: { rankKind: 'merchant' } })).total).toBe(20);
    expect((await listAccounts({ start: 0, end: 1, filters: { rankKind: 'retail' } })).total).toBe(31);
    expect(
      (await listAccounts({ start: 0, end: 1, filters: { rankKind: ['retail', 'merchant'] } })).total,
    ).toBe(51);
  });

  it('filters by a login, a status, a rank and a country, and searches name, email, company and username', async () => {
    expect((await listAccounts({ start: 0, end: 1, filters: { hasAccount: false } })).total).toBe(21);
    expect((await listAccounts({ start: 0, end: 1, filters: { hasAccount: true } })).total).toBe(30);
    expect(
      (await listAccounts({ start: 0, end: 1, filters: { status: ['suspended', 'blocked'] } })).total,
    ).toBe(4);
    const vip = await listAccounts({ filters: { rankId: 3 } });
    expect(vip.data.map((account) => account.name)).toEqual([
      'Zain Mobile Hub',
      'Phone Doctor FZE',
      'Cairo GSM Lab',
    ]);
    expect((await listAccounts({ q: 'karachi' })).data.map((account) => account.name)).toEqual([
      'Karachi Unlock Hub',
    ]);
    expect((await listAccounts({ q: 'ZAINMOBILEHUB' })).total).toBe(1);
    expect((await listAccounts({ q: 'zain-mobile-hub' })).data.map((account) => account.id)).toEqual([ZAIN]);
    expect((await listAccounts({ q: 'WHITMORE' })).data.map((account) => account.id)).toEqual([DANIEL]);
    expect((await listAccounts({ filters: { country: 'ES' } })).data.map((account) => account.id)).toContain(
      SOFIA,
    );
  });

  it('filters the invitations that are still waiting', async () => {
    const pending = await listAccounts({ filters: { invitationPending: true } });
    expect(pending.data.map((account) => account.id)).toContain(INVITED);
    expect(pending.data.every((account) => account.invitationPending)).toBe(true);
    expect(pending.total).toBe((await getAccountCounts()).invitationPending);
  });

  it('sorts by name, by rank order, by orders and by wallet balance, and pages', async () => {
    const byName = await listAccounts({
      start: 0,
      end: 2,
      sort: ['name'],
      order: ['asc'],
      filters: { rankKind: 'merchant' },
    });
    expect(byName.data.map((account) => account.name)).toEqual(['Accra Devices', 'Al-Noor Telecom']);
    const byRank = await listAccounts({ sort: ['rank'], order: ['desc'] });
    expect(byRank.data[0].rank.name).toBe('Storefront retail');
    expect(byRank.data.at(-1)?.rank.name).toBe('Standard');
    const byOrders = await listAccounts({ start: 0, end: 3, sort: ['ordersCount'], order: ['desc'] });
    const orders = byOrders.data.map((account) => account.ordersCount);
    expect(orders).toEqual([...orders].sort((a, b) => b - a));
    const byBalance = await listAccounts({
      start: 0,
      end: 2,
      sort: ['balance'],
      order: ['desc'],
      filters: { rankKind: 'merchant' },
    });
    expect(byBalance.data.map((account) => Number(account.wallet?.balance))).toEqual(
      [...byBalance.data.map((account) => Number(account.wallet?.balance))].sort((a, b) => b - a),
    );
  });

  it('carries the joined rank, the wallet and the 30-day figures, and the order figures of every door', async () => {
    const { data } = await listAccounts({ q: 'Zain' });
    expect(data[0]).toMatchObject({
      id: ZAIN,
      status: 'active',
      country: 'JO',
      username: 'zain-mobile-hub',
      hasAccount: true,
      rank: { id: 3, name: 'VIP', kind: 'merchant', discountPercent: '8.0000', creditAllowed: true },
      wallet: {
        kind: 'merchant',
        balance: '1209.7500',
        reserved: '71.2300',
        creditLimit: '2000.0000',
        available: '3209.7500',
        frozen: false,
      },
    });
    expect(data[0].stats?.orders).toBeGreaterThan(0);
    expect(data[0].ordersCount).toBeGreaterThan(0);
    expect(data[0]).not.toHaveProperty('referredBy');
    expect(data[0]).not.toHaveProperty('groupId');
    const daniel = (await listAccounts({ q: 'WHITMORE' })).data[0];
    expect(daniel).toMatchObject({
      id: DANIEL,
      name: 'Daniel Whitmore',
      status: 'active',
      hasAccount: true,
      currencyCode: 'GBP',
      ordersCount: 4,
      rank: { kind: 'retail' },
      wallet: { kind: 'store', balance: '50.0000' },
    });
    expect(daniel.lastOrderAt).toBeTruthy();
    expect(daniel).not.toHaveProperty('riskLevel');
    expect(daniel.username).toBeNull();
  });

  it('gives a guest no sign-in facts and no wallet, and one who never ordered no last order', async () => {
    const sofia = (await listAccounts({ q: 'sofia.alvarez@' })).data[0];
    expect(sofia).toMatchObject({
      id: SOFIA,
      hasAccount: false,
      security: null,
      ordersCount: 0,
      lastOrderAt: null,
    });
    expect(sofia).not.toHaveProperty('wallet');
  });
});

describe('getAccountCounts', () => {
  it('counts every population from one call', async () => {
    const seen = spy('get', '/admin/clients/counts', () =>
      HttpResponse.json({
        all: 1,
        retail: 1,
        merchant: 0,
        guests: 0,
        active: 1,
        suspended: 0,
        blocked: 0,
        anonymized: 0,
        invitationPending: 0,
      }),
    );
    expect((await getAccountCounts()).all).toBe(1);
    expect(seen[0]).toMatchObject({ method: 'GET', path: '/admin/clients/counts' });
  });

  it('reads the mock store: the strip, the statuses and the invitations', async () => {
    const counts = await getAccountCounts();
    expect(counts).toMatchObject({
      all: 51,
      retail: 31,
      merchant: 20,
      guests: 21,
      active: 47,
      suspended: 3,
      blocked: 1,
      anonymized: 0,
    });
    expect(counts.invitationPending).toBeGreaterThanOrEqual(1);
  });
});

describe('getAccount', () => {
  it('reads one account of any rank and any status', async () => {
    expect(await getAccount(INVITED)).toMatchObject({
      name: 'Algiers Service Plus',
      status: 'active',
      invitationPending: true,
    });
    expect(await getAccount(FORMER_PENDING)).toMatchObject({ name: 'Accra Devices', status: 'suspended' });
    expect(await getAccount(DANIEL)).toMatchObject({ name: 'Daniel Whitmore', rank: { kind: 'retail' } });
    expect(await getAccount(HANNAH)).toMatchObject({ status: 'suspended' });
  });

  it('turns a missing account into the server’s 404', async () => {
    await expect(getAccount(9999)).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('carries the sign-in facts, the business details and the suspension', async () => {
    expect(await getAccount(ZAIN)).toMatchObject({
      address: 'Abdali Boulevard, Amman',
      taxId: 'JO-1234567',
      internalNotes: 'Pays by bank transfer on Sundays.',
      suspension: null,
      security: {
        hasPassword: true,
        mustChangePassword: false,
        twofaEnabled: true,
        activeSessions: 1,
        linkSentAt: null,
      },
    });
    expect((await getAccount(INVITED)).security).toMatchObject({ hasPassword: false });
    expect((await getAccount(SUSPENDED_MERCHANT)).suspension).toMatchObject({
      reason: 'Chargeback dispute',
      by: { name: 'Rami K.' },
    });
  });

  it('turns the former pending merchant into a suspended account with the migration’s reason', async () => {
    const former = await getAccount(FORMER_PENDING);
    expect(former.status).toBe('suspended');
    expect(former.suspension?.reason).toMatch(/approval/);
  });

  it('gives an account its sign-in facts and a guest none', async () => {
    const daniel = await getAccount(DANIEL);
    expect(daniel.security).toMatchObject({
      activeSessions: 1,
      lastLoginIp: '203.0.113.177',
      mustChangePassword: false,
    });
    const sofia = await getAccount(SOFIA);
    expect(sofia.security).toBeNull();
    expect(sofia.emailVerifiedAt).toBeNull();
  });
});

describe('createAccount', () => {
  const retail = {
    name: 'Pat Example',
    email: 'pat@mail.example',
    country: 'DE',
    password: { mode: 'reset_link' as const },
  };
  const merchant = { name: 'Muscat Gadgets', email: 'Hello@Muscat.example', country: 'OM', groupId: 2 };

  it('sends the body as it is and gets the new account back', async () => {
    const seen = spy('post', '/admin/clients', () => HttpResponse.json({ id: 99 }, { status: 201 }));
    await createAccount({ ...merchant, creditLimit: '500.0000', password: { mode: 'reset_link' } });
    expect(seen[0]).toMatchObject({
      method: 'POST',
      body: { ...merchant, creditLimit: '500.0000', password: { mode: 'reset_link' } },
    });
  });

  it('adds a retail account with a login on the retail rank when no rank is asked for', async () => {
    const created = await createAccount(retail);
    expect(created).toMatchObject({
      name: 'Pat Example',
      hasAccount: true,
      status: 'active',
      rank: { kind: 'retail' },
      currencyCode: 'EUR',
      invitationPending: true,
      username: null,
    });
    expect(created).not.toHaveProperty('temporaryPassword');
    const detail = await getAccount(created.id);
    expect(detail.security).toMatchObject({ hasPassword: false, mustChangePassword: false });
    expect(detail.security?.linkSentAt).toBeTruthy();
    expect((await listAccounts({ start: 0, end: 1 })).total).toBe(52);
  });

  it('adds a merchant in the rank asked for, with a username, a company and the credit limit', async () => {
    const created = await createAccount({
      ...merchant,
      creditLimit: '500.0000',
      company: 'Muscat Gadgets LLC',
    });
    expect(created).toMatchObject({
      status: 'active',
      email: 'hello@muscat.example',
      country: 'OM',
      company: 'Muscat Gadgets LLC',
      username: 'muscat-gadgets',
      rank: { id: 2, name: 'Wholesale', kind: 'merchant' },
      wallet: { kind: 'merchant', creditLimit: '500.0000', available: '500.0000' },
    });
    expect((await listAccounts({ filters: { rankKind: 'merchant' }, start: 0, end: 1 })).total).toBe(21);
  });

  it('returns a temporary password once, only for that mode', async () => {
    const created = await createAccount({ ...retail, password: { mode: 'temporary_password' } });
    expect(created.temporaryPassword).toMatch(/^[A-Za-z0-9]{14}$/);
    expect(await getAccount(created.id)).not.toHaveProperty('temporaryPassword');
    expect((await getAccount(created.id)).security).toMatchObject({
      mustChangePassword: true,
      hasPassword: true,
    });
  });

  it('refuses an email that already has a login with the server’s EMAIL_TAKEN', async () => {
    const error = await createAccount({ ...retail, email: 'Daniel.Whitmore@mail.example' }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'EMAIL_TAKEN' });
    await expect(createAccount({ ...merchant, email: 'ops@zainmobilehub.example' })).rejects.toMatchObject({
      status: 409,
      code: 'EMAIL_TAKEN',
    });
  });

  it('answers a retail account whose email a guest bought with in words that point to "Make an account"', async () => {
    const error = (await createAccount({ ...retail, email: 'sofia.alvarez@inbox.example' }).catch(
      (e: unknown) => e,
    )) as ApiError;
    expect(error).toMatchObject({ status: 409, code: 'EMAIL_TAKEN' });
    expect(error.fieldErrors.email?.[0]).toMatch(/make that guest an account/i);
    // A merchant rank is allowed beside a guest row that holds the address.
    await expect(createAccount({ ...merchant, email: 'sofia.alvarez@inbox.example' })).resolves.toMatchObject(
      { rank: { id: 2 } },
    );
  });

  it('answers a bad form with a message per field, and refuses a company or a credit limit on a retail account', async () => {
    const error = (await createAccount({ name: '', email: 'nope', country: 'X' }).catch(
      (e: unknown) => e,
    )) as ApiError;
    expect(Object.keys(error.fieldErrors).sort()).toEqual(['country', 'email', 'name']);
    const retailExtras = (await createAccount({ ...retail, company: 'Acme', creditLimit: '5.0000' }).catch(
      (e: unknown) => e,
    )) as ApiError;
    expect(Object.keys(retailExtras.fieldErrors).sort()).toEqual(['company', 'creditLimit']);
    await expect(createAccount({ ...merchant, groupId: 1, creditLimit: '5.0000' })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { creditLimit: ['This rank allows no credit.'] },
    });
    await expect(createAccount({ ...retail, groupId: 99 })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { groupId: ['That rank does not exist.'] },
    });
  });
});

describe('updateAccount: details', () => {
  it('sends only what the caller names', async () => {
    const seen = spy('patch', `/admin/clients/${ZAIN}`, () => HttpResponse.json({ id: ZAIN }));
    await updateAccount(ZAIN, { company: 'Zain Hub LLC' });
    expect(seen[0]).toMatchObject({
      method: 'PATCH',
      path: `/admin/clients/${ZAIN}`,
      body: { company: 'Zain Hub LLC' },
    });
  });

  it('applies the details on the mock server', async () => {
    const updated = await updateAccount(ZAIN, { company: 'Zain Hub LLC', taxId: '' });
    expect(updated).toMatchObject({ company: 'Zain Hub LLC', taxId: '' });
    expect((await getAccount(ZAIN)).company).toBe('Zain Hub LLC');
  });

  it('cleans the name, the country and the email like the server', async () => {
    const updated = await updateAccount(ZAIN, {
      name: '  Zain   Hub ',
      country: 'sa',
      email: 'New@Zain.example',
    });
    expect(updated).toMatchObject({ name: 'Zain Hub', country: 'SA', email: 'new@zain.example' });
  });

  it('edits a retail account, derives its currency from the country, and clears verification on a new email', async () => {
    const updated = await updateAccount(DANIEL, {
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
      emailVerifiedAt: null,
    });
    expect((await getAccount(DANIEL)).security?.verificationSentAt).toBeTruthy();
  });

  it('clears verification and opens a new link when the email of a merchant changes', async () => {
    const updated = await updateAccount(ZAIN, { email: 'fresh@zain.example' });
    expect(updated.emailVerifiedAt).toBeNull();
    expect(updated.security?.verificationSentAt).not.toBeNull();
    // An invited account with no password gets the invitation again instead.
    const invited = await updateAccount(INVITED, { email: 'fresh@algiers.example' });
    expect(invited.security).toMatchObject({ hasPassword: false });
    expect(invited.security?.linkSentAt).not.toBeNull();
    expect(invited.security?.verificationSentAt).toBeNull();
  });

  it('refuses a taken email with EMAIL_TAKEN, a mix of kinds, a rank and an empty change with a 422', async () => {
    const other = (await getAccount(2)).email;
    await expect(updateAccount(ZAIN, { email: other })).rejects.toMatchObject({
      status: 409,
      code: 'EMAIL_TAKEN',
    });
    await expect(updateAccount(DANIEL, { email: 'sofia.alvarez@inbox.example' })).resolves.toMatchObject({
      id: DANIEL,
    });
    await expect(updateAccount(ZAIN, { email: 'OPS@zainmobilehub.example' })).resolves.toMatchObject({
      id: ZAIN,
    });
    await expect(
      updateAccount(ZAIN, { status: 'suspended', reason: 'Fraud review', name: 'Other' }),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { name: ['Send one change at a time: a status or details.'] },
    });
    await expect(updateAccount(ZAIN, { groupId: 2 } as never)).rejects.toMatchObject({ status: 422 });
    await expect(updateAccount(ZAIN, {})).rejects.toMatchObject({ status: 422 });
  });

  it('refuses a detail over its limit or in a bad shape with a message on its field', async () => {
    await expect(
      updateAccount(ZAIN, { name: ' ', country: 'JOR', email: 'nope', taxId: 'x'.repeat(41) }),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: {
        name: ['Enter a name.'],
        country: ['Enter the two-letter country code.'],
        email: ['Enter a valid email address.'],
        taxId: ['Use at most 40 characters.'],
      },
    });
    await expect(updateAccount(DANIEL, { country: 'PL' })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { country: ['Choose a country.'] },
    });
  });
});

describe('updateAccount: status', () => {
  it('suspends with a reason and reactivates, for a merchant and a shop account alike', async () => {
    const suspended = await updateAccount(ZAIN, { status: 'suspended', reason: 'Chargeback dispute' });
    expect(suspended).toMatchObject({
      status: 'suspended',
      suspension: { reason: 'Chargeback dispute', by: { name: 'Rami K.' } },
    });
    expect((await updateAccount(ZAIN, { status: 'active' })).suspension).toBeNull();
    expect((await updateAccount(DANIEL, { status: 'suspended', reason: 'Phone lost' })).status).toBe(
      'suspended',
    );
    expect((await updateAccount(DANIEL, { status: 'active' })).status).toBe('active');
  });

  it('refuses a status that is not a transition, a reason of the wrong length and the statuses with their own routes', async () => {
    await expect(updateAccount(ZAIN, { status: 'active' })).rejects.toMatchObject({
      status: 409,
      code: 'INVALID_TRANSITION',
    });
    await expect(updateAccount(HANNAH, { status: 'suspended', reason: 'Other' })).rejects.toMatchObject({
      status: 409,
      code: 'INVALID_TRANSITION',
    });
    await expect(updateAccount(ZAIN, { status: 'suspended', reason: 'x' })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { reason: ['Use 3 to 140 characters.'] },
    });
    await expect(updateAccount(ZAIN, { status: 'blocked' as never })).rejects.toMatchObject({ status: 422 });
    await expect(updateAccount(ZAIN, { status: 'pending' as never })).rejects.toMatchObject({ status: 422 });
  });

  it('ends the account’s sessions and cancels open links when suspended', async () => {
    expect((await getAccount(ZAIN)).security?.activeSessions).toBe(1);
    await updateAccount(ZAIN, { status: 'suspended', reason: 'Fraud review' });
    expect((await getAccount(ZAIN)).security?.activeSessions).toBe(0);
    expect((await getAccount(DANIEL)).security?.activeSessions).toBe(1);
    await updateAccount(DANIEL, { status: 'suspended', reason: 'Account may be compromised: phone lost' });
    expect((await getAccount(DANIEL)).security?.activeSessions).toBe(0);
  });

  it('refuses every write on an anonymized account', async () => {
    await anonymizeAccount(DANIEL);
    await expect(updateAccount(DANIEL, { name: 'Again' })).rejects.toMatchObject({
      status: 409,
      code: 'ANONYMIZED',
    });
  });
});

describe('makeAccount', () => {
  it('gives a guest a login with a link or a temporary password, on the retail rank', async () => {
    const seen = spy('post', `/admin/clients/${SOFIA}/account`, () => HttpResponse.json({}));
    await makeAccount(SOFIA, { mode: 'temporary_password' });
    expect(seen[0]).toMatchObject({ method: 'POST', body: { mode: 'temporary_password' } });
  });

  it('turns the guest into an account, and sets a temporary password once', async () => {
    const link = await makeAccount(SOFIA, { mode: 'reset_link' });
    expect(link.temporaryPassword).toBeUndefined();
    const sofia = await getAccount(SOFIA);
    expect(sofia).toMatchObject({ hasAccount: true, rank: { kind: 'retail' }, invitationPending: true });
    expect(sofia.security).toMatchObject({ mustChangePassword: false });
    const temporary = await makeAccount(SEED.MIA, { mode: 'temporary_password' });
    expect(temporary.temporaryPassword).toMatch(/^[A-Za-z0-9]{14}$/);
    expect((await getAccount(SEED.MIA)).security).toMatchObject({ mustChangePassword: true });
  });

  it('refuses an account for someone who has a login, and a mode that is not one', async () => {
    await expect(makeAccount(DANIEL, { mode: 'reset_link' })).rejects.toMatchObject({
      status: 409,
      code: 'ACCOUNT_EXISTS',
    });
    await expect(makeAccount(SOFIA, { mode: 'nope' as never })).rejects.toMatchObject({ status: 422 });
    await expect(makeAccount(9999, { mode: 'reset_link' })).rejects.toMatchObject({ status: 404 });
  });

  it('refuses a guest whose email another account with a login uses', async () => {
    await updateAccount(DANIEL, { email: 'Sofia.Alvarez@inbox.example' });
    await expect(makeAccount(SOFIA, { mode: 'reset_link' })).rejects.toMatchObject({
      status: 409,
      code: 'EMAIL_TAKEN',
    });
  });
});

describe('findLegacyAccount', () => {
  it('asks the server which account an old record became, never guessing', async () => {
    const seen = spy('get', '/admin/legacy-accounts/customer/5', () => HttpResponse.json({ accountId: 105 }));
    expect(await findLegacyAccount('customer', 5)).toEqual({ accountId: 105 });
    expect(seen[0]).toMatchObject({ method: 'GET', path: '/admin/legacy-accounts/customer/5' });
  });

  it('moves a customer’s number and keeps a merchant’s on the mock server', async () => {
    expect(await findLegacyAccount('customer', 1)).toEqual({ accountId: DANIEL });
    expect(await findLegacyAccount('merchant', ZAIN)).toEqual({ accountId: ZAIN });
    expect(await findLegacyAccount('client', 5)).toEqual({ accountId: 5 });
  });

  it('answers 404 for an old record that does not exist, an account made since the merge, and a type it does not know', async () => {
    await expect(findLegacyAccount('customer', 500)).rejects.toMatchObject({ status: 404 });
    await expect(findLegacyAccount('merchant', 101)).rejects.toMatchObject({ status: 404 });
    const created = await createAccount({ name: 'New One', email: 'new.one@mail.example', country: 'DE' });
    await expect(findLegacyAccount('merchant', created.id)).rejects.toMatchObject({ status: 404 });
    await expect(findLegacyAccount('staff' as never, 1)).rejects.toMatchObject({ status: 404 });
  });
});

describe('the orders of an anonymized account', () => {
  it('cuts the IMEIs of the account’s orders and replaces the buyer on them', async () => {
    const before = await listOrders({ filters: { accountId: DANIEL } });
    expect(before.data[0].account.name).toBe('Daniel Whitmore');
    await anonymizeAccount(DANIEL);
    const after = await listOrders({ filters: { accountId: DANIEL } });
    expect(after.data).toHaveLength(4);
    expect(after.data.every((order) => order.account.name === 'Deleted account')).toBe(true);
    expect(after.data.every((order) => order.imei.endsWith('•••••••'))).toBe(true);
  });
});
