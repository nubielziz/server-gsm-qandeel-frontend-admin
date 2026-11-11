// A merchant's API keys (`/admin/clients/:id/api-keys`, `/admin/api-keys/:id`). Ports merApiTab of 42-p-merchants.js. The demo's
// "Rotate key" has no admin route (merchants create their own keys), so staff could only list and revoke (MISMATCHES M45); feature 20
// adds creating a key for an active merchant and changing a key's limits.
import { apiDelete, apiGet, apiPatch, apiPost, pathOf, type ApiInit, type Id } from '@/lib/api';
import type { ApiKey, CreateApiKeyBody, CreatedApiKey, UpdateApiKeyBody } from '../types';

/**
 * The keys of one merchant, newest first as the server sends them: name, prefix, allowed addresses, last use and whether
 * a key is revoked or expired. The secret is never readable. Needs `api_keys:read`.
 * Assumed contract: a plain array.
 * @route GET /admin/clients/:id/api-keys
 */
export function listClientApiKeys(clientId: Id, init?: ApiInit): Promise<ApiKey[]> {
  return apiGet<ApiKey[]>(pathOf('/admin/clients/:id/api-keys', { id: clientId }), undefined, init);
}

/**
 * Revokes a key: it stops working at once and cannot be turned back on (the merchant makes a new one). The server writes
 * the audit entry. Needs `api_keys:revoke`.
 * Assumed contract: no body, answer 204.
 * @route DELETE /admin/api-keys/:id
 */
export function revokeApiKey(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/api-keys/:id', { id }), undefined, init);
}

/**
 * Creates a key for an active merchant. The answer carries the full key once as `secret`; only a keyed hash is stored, so it can
 * never be shown again. The key is marked `createdByStaff` and the merchant is mailed a security notice. Needs `api_keys:create`.
 * Refusals: `NOT_ACTIVE` (409, the merchant is not active), `VALIDATION_FAILED` (422 on `name`, `scopes.N`, `allowedIps.N`,
 * `expiresAt` or `rateLimitPerMin`; a merchant may hold ten live keys, the next one is a 422 on `name`).
 * @route POST /admin/clients/:id/api-keys
 */
export function createClientApiKey(
  clientId: Id,
  body: CreateApiKeyBody,
  init?: ApiInit,
): Promise<CreatedApiKey> {
  return apiPost<CreatedApiKey>(pathOf('/admin/clients/:id/api-keys', { id: clientId }), body, init);
}

/**
 * Changes a key's per-minute limit and allowed addresses (an empty `allowedIps` removes the restriction). It takes effect on the
 * key's next call. Needs `api_keys:update`. Refusals: `ALREADY_REVOKED` (409), `VALIDATION_FAILED` (422).
 * @route PATCH /admin/api-keys/:id
 */
export function updateApiKey(id: Id, body: UpdateApiKeyBody, init?: ApiInit): Promise<ApiKey> {
  return apiPatch<ApiKey>(pathOf('/admin/api-keys/:id', { id }), body, init);
}
