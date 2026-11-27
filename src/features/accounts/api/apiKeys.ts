// The API keys of an account (`/admin/clients/:id/api-keys`, `/admin/api-keys/:id`): only an account with a merchant rank holds keys (a
// retail account answers 409 `CONFLICT`). Ports merApiTab of 42-p-merchants.js. The demo's "Rotate key" has no admin route
// (MISMATCHES M45); staff list, create (the Owner only, decision 046), edit (name, addresses, expiry, limit; decision 039), and revoke keys.
import { apiDelete, apiGet, apiPatch, apiPost, pathOf, type ApiInit, type Id } from '@/lib/api';
import type { ApiKey, CreateApiKeyBody, CreatedApiKey, UpdateApiKeyBody } from '../types';

/**
 * The one scope a key carries: a key is a Dhru credential. A backend that still keeps a scope list asks for at least one entry on
 * a new key and accepts this one; a backend that no longer has the list ignores the field.
 */
const KEY_SCOPES = ['dhru'];

/**
 * The keys of one account, newest first as the server sends them: name, prefix, allowed addresses, last use and whether a key is
 * revoked or expired. The secret is never readable. Needs `api_keys:read`.
 * Assumed contract: a plain array.
 * @route GET /admin/clients/:id/api-keys
 */
export function listAccountApiKeys(accountId: Id, init?: ApiInit): Promise<ApiKey[]> {
  return apiGet<ApiKey[]>(pathOf('/admin/clients/:id/api-keys', { id: accountId }), undefined, init);
}

/**
 * Revokes a key: it stops working at once and cannot be turned back on (the account makes a new one). The server writes the audit
 * entry. Needs `api_keys:revoke`.
 * Assumed contract: no body, answer 204.
 * @route DELETE /admin/api-keys/:id
 */
export function revokeApiKey(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/api-keys/:id', { id }), undefined, init);
}

/**
 * Creates a key for an active account with a merchant rank (the Owner only). With no `name` in the body the server names the key
 * `API key <n>` (the one-click "Generate API key", backend decision 078). The answer carries the full key once as `secret`; only
 * a keyed hash is stored, so it can never be shown again. The key is marked `createdByStaff` and the account is mailed a security
 * notice. Needs `api_keys:create`. Refusals: `NOT_ACTIVE` (409), `CONFLICT` (409, a retail account), `VALIDATION_FAILED` (422 on
 * `name`, `allowedIps.N`, `expiresAt` or `rateLimitPerMin`; an account may hold ten live keys, the next one is a 422 on `name`).
 * The body goes out with `scopes: ['dhru']` (see `KEY_SCOPES`).
 * @route POST /admin/clients/:id/api-keys
 */
export function createAccountApiKey(
  accountId: Id,
  body: CreateApiKeyBody,
  init?: ApiInit,
): Promise<CreatedApiKey> {
  return apiPost<CreatedApiKey>(
    pathOf('/admin/clients/:id/api-keys', { id: accountId }),
    { ...body, scopes: KEY_SCOPES },
    init,
  );
}

/**
 * Changes a key: its name, per-minute limit, allowed addresses (an empty `allowedIps` removes the restriction) and expiry (`expiresAt`
 * `null` removes it). Only the fields sent change. It takes effect on the key's next call. Needs `api_keys:update`. Refusals:
 * `FORBIDDEN` (403: more reach, that is no restriction or a new address, a higher limit, no expiry or a later one, is for an Owner),
 * `ALREADY_REVOKED` (409), `VALIDATION_FAILED` (422 on `name`, `allowedIps.N`, `rateLimitPerMin` or `expiresAt`).
 * @route PATCH /admin/api-keys/:id
 */
export function updateApiKey(id: Id, body: UpdateApiKeyBody, init?: ApiInit): Promise<ApiKey> {
  return apiPatch<ApiKey>(pathOf('/admin/api-keys/:id', { id }), body, init);
}
