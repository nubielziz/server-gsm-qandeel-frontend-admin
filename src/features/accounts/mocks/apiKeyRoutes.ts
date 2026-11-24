// Mock of an account's API keys (`GET` and `POST /admin/clients/:id/api-keys`, `PATCH` and `DELETE /admin/api-keys/:id`). Only an account with a
// merchant rank holds keys (a retail account is a 409 `CONFLICT`). The mock refuses revoking a key twice, a key for an account that is not
// active, an eleventh live key and a bad limit, so the dialogs have a server answer to show. The real rules are the server's (decision 014).
import { HttpResponse, type HttpHandler } from 'msw';
import { problem } from '@/mocks/problem';
import { context, rankOf, type Context } from './context';
import { checkKeyLimits, checkNewKey, newSecret } from './keyInput';
import { bodyOf, idOf, invalid, noContent, notFound, route } from './shared';
import type { MockAccount } from './types';

const retailAccount = () =>
  problem(409, 'CONFLICT', 'No API keys', 'Only an account with a merchant rank has API keys.');

const hasKeys = (ctx: Context, account: MockAccount) => rankOf(ctx, account).rankKind === 'merchant';

export const apiKeyRoutes: HttpHandler[] = [
  route('get', '/admin/clients/:id/api-keys', async (call) => {
    const ctx = await context();
    const account = ctx.state.accounts.find(idOf(call));
    if (!account) return notFound('account', call.params.id);
    if (!hasKeys(ctx, account)) return retailAccount();
    const keys = ctx.state.keys.list().filter((key) => key.clientId === account.id);
    return HttpResponse.json(keys.sort((a, b) => b.id - a.id));
  }),

  // Staff (the Owner) create a key for an active account; the full key comes back once.
  route('post', '/admin/clients/:id/api-keys', async (call) => {
    const ctx = await context();
    const account = ctx.state.accounts.find(idOf(call));
    if (!account) return notFound('account', call.params.id);
    if (!hasKeys(ctx, account)) return retailAccount();
    if (account.status !== 'active') {
      return problem(
        409,
        'NOT_ACTIVE',
        'Not active',
        'A key of a suspended or blocked account cannot be used. Reactivate the account first.',
      );
    }
    const { value, errors } = checkNewKey(await bodyOf(call.request));
    const now = Date.now();
    const live = ctx.state.keys
      .list()
      .filter(
        (key) =>
          key.clientId === account.id &&
          !key.revokedAt &&
          !(key.expiresAt && Date.parse(key.expiresAt) <= now),
      );
    if (live.length >= 10) {
      errors.push({ field: 'name', message: 'This account already has 10 live keys. Revoke one first.' });
    }
    if (errors.length > 0) return invalid(errors);
    const { secret, prefix } = newSecret();
    const key = ctx.state.keys.insert({
      clientId: account.id,
      name: value.name ?? 'Key',
      prefix,
      allowedIps: value.allowedIps ?? [],
      rateLimitPerMin: value.rateLimitPerMin ?? 60,
      lastUsedAt: null,
      lastUsedIp: '',
      expiresAt: value.expiresAt ?? null,
      revokedAt: null,
      createdAt: new Date(now).toISOString(),
      createdByStaff: true,
    });
    return HttpResponse.json({ key, secret }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  }),

  // Staff change a live key's per-minute limit and allowed addresses.
  route('patch', '/admin/api-keys/:id', async (call) => {
    const { state } = await context();
    const key = state.keys.find(idOf(call));
    if (!key) return notFound('API key', call.params.id);
    if (key.revokedAt)
      return problem(409, 'ALREADY_REVOKED', 'Already revoked', 'This key was already revoked.');
    const { value, errors } = checkKeyLimits(await bodyOf(call.request));
    if (errors.length > 0) return invalid(errors);
    const updated = state.keys.patch(key.id, {
      ...(value.rateLimitPerMin !== undefined ? { rateLimitPerMin: value.rateLimitPerMin } : {}),
      ...(value.allowedIps !== undefined ? { allowedIps: value.allowedIps } : {}),
    });
    return updated ? HttpResponse.json(updated) : notFound('API key', key.id);
  }),

  route('delete', '/admin/api-keys/:id', async (call) => {
    const { state } = await context();
    const key = state.keys.find(idOf(call));
    if (!key) return notFound('API key', call.params.id);
    if (key.revokedAt)
      return problem(409, 'ALREADY_REVOKED', 'Already revoked', 'This key was already revoked.');
    state.keys.patch(key.id, { revokedAt: new Date().toISOString() });
    return noContent();
  }),
];
