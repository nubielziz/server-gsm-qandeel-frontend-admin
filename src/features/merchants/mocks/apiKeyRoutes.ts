// Mock of a merchant's API keys (`GET` and `POST /admin/clients/:id/api-keys`, `PATCH` and `DELETE /admin/api-keys/:id`). The mock refuses
// revoking a key twice, a key for a merchant who is not active, an eleventh live key and a bad limit, so the dialogs have a server
// answer to show. The real rules are the server's (decision 014).
import { HttpResponse, type HttpHandler } from 'msw';
import { problem } from '@/mocks/problem';
import { checkKeyLimits, checkNewKey, newSecret } from './keyInput';
import { bodyOf, idOf, invalid, noContent, notFound, route } from './shared';
import { merchantStore } from './store';

export const apiKeyRoutes: HttpHandler[] = [
  route('get', '/admin/clients/:id/api-keys', async (call) => {
    const store = await merchantStore();
    const id = idOf(call);
    if (!store.clients.find(id)) return notFound('merchant', call.params.id);
    const keys = store.keys.list().filter((key) => key.clientId === id);
    return HttpResponse.json(keys.sort((a, b) => b.id - a.id));
  }),

  // Staff create a key for an active merchant; the full key comes back once.
  route('post', '/admin/clients/:id/api-keys', async (call) => {
    const store = await merchantStore();
    const client = store.clients.find(idOf(call));
    if (!client) return notFound('merchant', call.params.id);
    if (client.status !== 'active') {
      return problem(
        409,
        'NOT_ACTIVE',
        'Not active',
        'A key of a pending or suspended merchant cannot be used. Activate or reactivate the account first.',
      );
    }
    const { value, errors } = checkNewKey(await bodyOf(call.request));
    const now = Date.now();
    const live = store.keys
      .list()
      .filter(
        (key) =>
          key.clientId === client.id &&
          !key.revokedAt &&
          !(key.expiresAt && Date.parse(key.expiresAt) <= now),
      );
    if (live.length >= 10) {
      errors.push({ field: 'name', message: 'This merchant already has 10 live keys. Revoke one first.' });
    }
    if (errors.length > 0) return invalid(errors);
    const { secret, prefix } = newSecret();
    const key = store.keys.insert({
      clientId: client.id,
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
    const store = await merchantStore();
    const key = store.keys.find(idOf(call));
    if (!key) return notFound('API key', call.params.id);
    if (key.revokedAt)
      return problem(409, 'ALREADY_REVOKED', 'Already revoked', 'This key was already revoked.');
    const { value, errors } = checkKeyLimits(await bodyOf(call.request));
    if (errors.length > 0) return invalid(errors);
    const updated = store.keys.patch(key.id, {
      ...(value.rateLimitPerMin !== undefined ? { rateLimitPerMin: value.rateLimitPerMin } : {}),
      ...(value.allowedIps !== undefined ? { allowedIps: value.allowedIps } : {}),
    });
    return updated ? HttpResponse.json(updated) : notFound('API key', key.id);
  }),

  route('delete', '/admin/api-keys/:id', async (call) => {
    const store = await merchantStore();
    const key = store.keys.find(idOf(call));
    if (!key) return notFound('API key', call.params.id);
    if (key.revokedAt)
      return problem(409, 'ALREADY_REVOKED', 'Already revoked', 'This key was already revoked.');
    store.keys.patch(key.id, { revokedAt: new Date().toISOString() });
    return noContent();
  }),
];
