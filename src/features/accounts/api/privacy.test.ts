// Tests for the privacy functions of an account (the read, block, export, anonymize), run against the dev mock API: each reaches its route
// with the method and body of its contract, the mock keeps simple state, and an export or an anonymization closes the matching data
// request. Ports the customer privacy and block cases for every rank.
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { noContent, SEED, spy } from '../test/apiSupport';
import { installAccountMocks } from '../test/installAccountMocks';
import {
  anonymizeAccount,
  blockAccount,
  exportAccountData,
  getAccount,
  getAccountPrivacy,
  listDataRequests,
} from '.';
import { accountState } from '../mocks/store';

setupMockApi();
installAccountMocks();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const { ZAIN, DANIEL, SOFIA, MIA, JACK } = SEED;

function stubDownload() {
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:test', revokeObjectURL: vi.fn() }));
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
}

describe('getAccountPrivacy', () => {
  it('gives an account its consent records, its marketing choice and its risk summary', async () => {
    const daniel = await getAccountPrivacy(DANIEL);
    expect(daniel.marketingOptIn).toBe(false);
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

  it('gives an account that never ordered no consent records and no risk', async () => {
    const sofia = await getAccountPrivacy(SOFIA);
    expect(sofia.latestConsents).toBeNull();
    expect(sofia.risk).toEqual({ highestScore: null, signals: [] });
  });

  it('lists the risk signals with the order each was seen on', async () => {
    const jack = await getAccountPrivacy(JACK);
    expect(jack.risk.highestScore).toBe(71);
    expect(jack.risk.signals).toEqual([
      { text: 'Email on a previous chargeback', orderId: 20400 },
      { text: 'Disposable email domain', orderId: 20400 },
    ]);
  });

  it('answers a merchant too, and 404 for an account that does not exist', async () => {
    expect(await getAccountPrivacy(ZAIN)).toMatchObject({ marketingOptIn: false });
    await expect(getAccountPrivacy(9999)).rejects.toMatchObject({ status: 404 });
  });
});

describe('blockAccount', () => {
  it('sends the reason, or the lifting of the block', async () => {
    const seen = spy('post', '/admin/clients/:id/block', noContent);
    await blockAccount(5, { blocked: true, reason: 'Card testing or fraud' });
    await blockAccount(5, { blocked: false });
    expect(seen.map((call) => call.body)).toEqual([
      { blocked: true, reason: 'Card testing or fraud' },
      { blocked: false },
    ]);
    expect(seen[0].path).toBe('/admin/clients/5/block');
  });

  it('blocks with the reason as a note, ends the sessions, and lifts the block', async () => {
    await blockAccount(DANIEL, { blocked: true, reason: 'Abuse of refunds' });
    expect(await getAccount(DANIEL)).toMatchObject({
      status: 'blocked',
      internalNotes: 'Abuse of refunds',
      security: { activeSessions: 0 },
    });
    await blockAccount(DANIEL, { blocked: false });
    expect(await getAccount(DANIEL)).toMatchObject({ status: 'active' });
    await expect(blockAccount(DANIEL, { blocked: false })).rejects.toMatchObject({ status: 409 });
  });

  it('blocks a merchant as well, and refuses a block without a reason or a second block', async () => {
    await blockAccount(ZAIN, { blocked: true, reason: 'Chargeback or dispute' });
    expect((await getAccount(ZAIN)).status).toBe('blocked');
    await expect(blockAccount(ZAIN, { blocked: true, reason: 'Again' })).rejects.toMatchObject({
      status: 409,
      code: 'ALREADY_BLOCKED',
    });
    await expect(blockAccount(SOFIA, { blocked: true, reason: '' })).rejects.toMatchObject({ status: 422 });
  });
});

describe('exportAccountData', () => {
  it('downloads the export as a file named by the server, or account-<id>.json', async () => {
    stubDownload();
    const plain = spy('get', '/admin/clients/:id/export', () => new HttpResponse('{}'));
    expect(await exportAccountData(7)).toBe('account-7.json');
    expect(plain[0]).toMatchObject({ method: 'GET', path: '/admin/clients/7/export' });
    // A server that names the file.
    mockServer.use(
      http.get(
        '*/admin/clients/:id/export',
        () =>
          new HttpResponse('{}', {
            headers: { 'Content-Disposition': 'attachment; filename="export-7.json"' },
          }),
      ),
    );
    expect(await exportAccountData(7)).toBe('export-7.json');
  });

  it('closes the account’s open export request, but not its erasure request', async () => {
    stubDownload();
    const { requests } = await accountState();
    requests.insert({
      accountId: MIA,
      kind: 'export',
      status: 'open',
      requestedAt: new Date().toISOString(),
      dueAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      completedAt: null,
      handledBy: null,
      fileId: null,
      createdAt: new Date().toISOString(),
    });
    expect(await exportAccountData(MIA)).toBe(`account-${MIA}.json`);
    const mine = (await listDataRequests({ filters: { accountId: MIA } })).data;
    expect(mine.map((request) => `${request.kind}:${request.status}`).sort()).toEqual([
      'erasure:open',
      'export:completed',
    ]);
  });

  it('exports a merchant with its rank, and answers 404 for an account that does not exist', async () => {
    stubDownload();
    expect(await exportAccountData(ZAIN)).toBe('account-1.json');
    await expect(exportAccountData(9999)).rejects.toMatchObject({ status: 404 });
  });
});

describe('anonymizeAccount', () => {
  it('removes the name, the email and the notes, and closes the open erasure request', async () => {
    await anonymizeAccount(MIA);
    expect(await getAccount(MIA)).toMatchObject({
      name: 'Deleted account',
      email: `deleted-account-${MIA}@redacted.invalid`,
      status: 'anonymized',
      hasAccount: false,
      marketingOptIn: false,
      internalNotes: '',
    });
    expect((await getAccount(MIA)).anonymizedAt).toBeTruthy();
    const request = (await listDataRequests({ filters: { accountId: MIA } })).data[0];
    expect(request).toMatchObject({ status: 'completed', accountName: 'Deleted account' });
    expect(request.completedAt).toBeTruthy();
    await expect(anonymizeAccount(MIA)).rejects.toMatchObject({ status: 409, code: 'ANONYMIZED' });
  });

  it('refuses a merchant rank: move the account to the retail rank first', async () => {
    await expect(anonymizeAccount(ZAIN)).rejects.toMatchObject({ status: 409, code: 'CONFLICT' });
    expect((await getAccount(ZAIN)).status).toBe('active');
  });

  it('uses the route of the contract', async () => {
    const seen = spy('post', '/admin/clients/:id/anonymize', noContent);
    await anonymizeAccount(5);
    expect(seen[0]).toMatchObject({ method: 'POST', path: '/admin/clients/5/anonymize' });
  });
});
