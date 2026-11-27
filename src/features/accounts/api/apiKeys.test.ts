// Tests for the API key functions of an account, run against the dev mock API: the keys of an account with a merchant rank, listed without
// their secrets, created by staff (the secret once), limited and revoked; a retail account has none. Ports the merchant key cases.
import { HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { roleStore } from '@/mocks/roles';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { noContent, SEED, spy } from '../test/apiSupport';
import { installAccountMocks } from '../test/installAccountMocks';
import { createAccountApiKey, listAccountApiKeys, revokeApiKey, updateApiKey } from '.';

setupMockApi();
installAccountMocks();
beforeEach(async () => {
  await signInAs();
});

const { ZAIN, FORMER_PENDING, DANIEL, HANNAH } = SEED;

describe('listAccountApiKeys', () => {
  it('lists the keys of an account without their secrets, newest first', async () => {
    const keys = await listAccountApiKeys(ZAIN);
    expect(keys.map((key) => key.name)).toEqual(['Legacy integration', 'Staging', 'Production']);
    expect(keys[2]).toMatchObject({ prefix: 'gsm_live_69xx', allowedIps: ['203.0.113.55'], revokedAt: null });
    expect(keys[0].revokedAt).not.toBeNull();
    expect(Object.keys(keys[2])).not.toContain('secret');
    expect(await listAccountApiKeys(FORMER_PENDING)).toEqual([]);
  });

  it('answers 409 for a retail account, which has no keys, and 404 for no account', async () => {
    await expect(listAccountApiKeys(DANIEL)).rejects.toMatchObject({ status: 409, code: 'CONFLICT' });
    await expect(listAccountApiKeys(9999)).rejects.toMatchObject({ status: 404 });
  });
});

describe('revokeApiKey', () => {
  it('revokes a key, and refuses a second revoke', async () => {
    const [, , production] = await listAccountApiKeys(ZAIN);
    await revokeApiKey(production.id);
    expect(
      (await listAccountApiKeys(ZAIN)).find((key) => key.id === production.id)?.revokedAt,
    ).not.toBeNull();
    await expect(revokeApiKey(production.id)).rejects.toMatchObject({ status: 409, code: 'ALREADY_REVOKED' });
    await expect(revokeApiKey(9999)).rejects.toMatchObject({ status: 404 });
  });

  it('uses the key route of the map', async () => {
    const seen = spy('delete', '/admin/api-keys/7', noContent);
    await revokeApiKey(7);
    expect(seen[0]).toMatchObject({ method: 'DELETE', path: '/admin/api-keys/7' });
  });
});

describe('createAccountApiKey', () => {
  it('creates a key for an active account: the secret once, the row marked as made by staff', async () => {
    const created = await createAccountApiKey(ZAIN, {
      name: 'Support key',
      allowedIps: ['203.0.113.9'],
      rateLimitPerMin: 300,
    });
    expect(created.secret).toMatch(/^gsm_[A-Za-z0-9]{44}$/);
    expect(created.key).toMatchObject({
      clientId: ZAIN,
      name: 'Support key',
      prefix: created.secret.slice(0, 8),
      allowedIps: ['203.0.113.9'],
      rateLimitPerMin: 300,
      createdByStaff: true,
      revokedAt: null,
    });
    const keys = await listAccountApiKeys(ZAIN);
    expect(keys[0].id).toBe(created.key.id);
    expect(JSON.stringify(keys)).not.toContain(created.secret);
  });

  it('refuses an account that is not active or has a retail rank, bad entries and the eleventh live key', async () => {
    await expect(createAccountApiKey(FORMER_PENDING, { name: 'K' })).rejects.toMatchObject({
      status: 409,
      code: 'NOT_ACTIVE',
    });
    await expect(createAccountApiKey(HANNAH, { name: 'K' })).rejects.toMatchObject({
      status: 409,
      code: 'CONFLICT',
    });
    await expect(
      createAccountApiKey(ZAIN, {
        name: '',
        allowedIps: ['nope'],
        rateLimitPerMin: 7000,
        expiresAt: '2000-01-01T00:00:00.000Z',
      }),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: {
        name: ['Name the key.'],
        'allowedIps.0': ['Enter an IP address or range.'],
        rateLimitPerMin: ['Use at most 6000.'],
        expiresAt: ['Use a time in the future.'],
      },
    });
    // Zain holds two live keys (Production, Staging); eight more reach ten.
    for (let n = 0; n < 8; n += 1) await createAccountApiKey(ZAIN, { name: `Key ${n}` });
    await expect(createAccountApiKey(ZAIN, { name: 'One too many' })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { name: ['This account already has 10 live keys. Revoke one first.'] },
    });
  });

  it('names a key made with no name `API key <n>`: the smallest number no key of the account holds', async () => {
    const first = await createAccountApiKey(ZAIN, {});
    const second = await createAccountApiKey(ZAIN, {});
    expect([first.key.name, second.key.name]).toEqual(['API key 1', 'API key 2']);
    // A name that only looks alike holds no number, and a name that was typed keeps its own.
    await createAccountApiKey(ZAIN, { name: 'API key 03' });
    expect((await createAccountApiKey(ZAIN, {})).key.name).toBe('API key 3');
    await updateApiKey(first.key.id, { name: 'Renamed' });
    expect((await createAccountApiKey(ZAIN, {})).key.name).toBe('API key 1');
  });

  it('refuses a blank name that was sent, though a name left out is fine', async () => {
    await expect(createAccountApiKey(ZAIN, { name: '   ' })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { name: ['Name the key.'] },
    });
  });

  it('sends the body of its contract, with the one scope of a Dhru key', async () => {
    const created = spy('post', '/admin/clients/7/api-keys', () =>
      HttpResponse.json({ key: { id: 1 }, secret: 's' }),
    );
    await createAccountApiKey(7, { name: 'K' });
    expect(created[0]).toMatchObject({
      method: 'POST',
      path: '/admin/clients/7/api-keys',
      body: { name: 'K', scopes: ['dhru'] },
    });
  });
});

describe('updateApiKey', () => {
  it('changes the limit and the addresses of a live key, and refuses a revoked key', async () => {
    const [, , production] = await listAccountApiKeys(ZAIN);
    const updated = await updateApiKey(production.id, { rateLimitPerMin: 300, allowedIps: [] });
    expect(updated).toMatchObject({ id: production.id, rateLimitPerMin: 300, allowedIps: [] });
    expect((await listAccountApiKeys(ZAIN)).find((key) => key.id === production.id)).toMatchObject({
      rateLimitPerMin: 300,
    });
    await expect(updateApiKey(production.id, {})).rejects.toMatchObject({ status: 422 });
    await expect(updateApiKey(production.id, { rateLimitPerMin: 0 })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { rateLimitPerMin: ['Use at least 1.'] },
    });
    await revokeApiKey(production.id);
    await expect(updateApiKey(production.id, { rateLimitPerMin: 10 })).rejects.toMatchObject({
      status: 409,
      code: 'ALREADY_REVOKED',
    });
    await expect(updateApiKey(9999, { rateLimitPerMin: 10 })).rejects.toMatchObject({ status: 404 });
  });

  it('changes the name and the expiry, and `null` removes the expiry', async () => {
    const [, , production] = await listAccountApiKeys(ZAIN);
    const later = new Date(Date.now() + 30 * 86_400_000).toISOString();
    expect(await updateApiKey(production.id, { name: 'Main server', expiresAt: later })).toMatchObject({
      name: 'Main server',
      expiresAt: later,
    });
    expect(await updateApiKey(production.id, { expiresAt: null })).toMatchObject({ expiresAt: null });
    await expect(updateApiKey(production.id, { name: ' ' })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { name: ['Name the key.'] },
    });
    await expect(
      updateApiKey(production.id, { expiresAt: '2000-01-01T00:00:00.000Z' }),
    ).rejects.toMatchObject({ status: 422, fieldErrors: { expiresAt: ['Use a time in the future.'] } });
  });

  it('answers 403 to a staff member who is not the Owner for a change that gives a key more reach', async () => {
    const [, , production] = await listAccountApiKeys(ZAIN);
    // Narrow first, as anyone with the permission may: a first end, a lower limit.
    await updateApiKey(production.id, { expiresAt: new Date(Date.now() + 10 * 86_400_000).toISOString() });
    roleStore().patch(1, { permissions: ['api_keys:read', 'api_keys:update'] });
    await expect(updateApiKey(production.id, { rateLimitPerMin: 60, name: 'Calmer' })).resolves.toMatchObject(
      {
        name: 'Calmer',
        rateLimitPerMin: 60,
      },
    );
    // More reach is the Owner's: no restriction, a higher limit, a later end, no end.
    for (const body of [
      { allowedIps: [] },
      { allowedIps: ['198.51.100.1'] },
      { rateLimitPerMin: 600 },
      { expiresAt: new Date(Date.now() + 90 * 86_400_000).toISOString() },
      { expiresAt: null },
    ]) {
      await expect(updateApiKey(production.id, body)).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN',
        detail:
          'Only an owner can widen an API key: more addresses, a higher limit, or a later or no end date.',
      });
    }
  });

  it('uses the route of the backend contract', async () => {
    const seen = spy('patch', '/admin/api-keys/7', () => HttpResponse.json({ id: 7 }));
    await updateApiKey(7, { rateLimitPerMin: 300 });
    expect(seen[0]).toMatchObject({
      method: 'PATCH',
      path: '/admin/api-keys/7',
      body: { rateLimitPerMin: 300 },
    });
    await updateApiKey(7, { name: 'Main', expiresAt: null });
    expect(seen[1]).toMatchObject({ body: { name: 'Main', expiresAt: null } });
  });
});
