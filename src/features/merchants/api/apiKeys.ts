// A merchant's API keys (`/admin/clients/:id/api-keys`, `/admin/api-keys/:id`). Ports merApiTab of 42-p-merchants.js. The demo's
// "Rotate key" has no admin route (merchants create their own keys), so staff can only list and revoke (MISMATCHES M45).
import { apiDelete, apiGet, pathOf, type ApiInit, type Id } from '@/lib/api';
import type { ApiKey } from '../types';

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
