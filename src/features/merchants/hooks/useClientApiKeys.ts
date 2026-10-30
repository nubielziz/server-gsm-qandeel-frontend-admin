// A merchant's API keys and the revoke action. The demo's "Rotate key" has no admin route (merchants make their own keys), so
// staff can list and revoke (MISMATCHES M45).
import { useApiMutation, useApiQuery } from '@/lib/query';
import { listClientApiKeys, revokeApiKey } from '../api';
import type { ApiKey } from '../types';
import { API_KEYS_KEY } from './keys';

/** The keys of one merchant. Pass `enabled: false` while the staff member lacks `api_keys:read`. */
export function useClientApiKeys(clientId: number, enabled = true) {
  return useApiQuery({
    queryKey: [...API_KEYS_KEY, clientId],
    queryFn: ({ signal }) => listClientApiKeys(clientId, { signal }),
    enabled,
  });
}

/** Revokes a key at once. The dialog shows a failed call itself. */
export function useRevokeApiKey() {
  return useApiMutation({
    mutationFn: (key: ApiKey) => revokeApiKey(key.id),
    invalidateKeys: [API_KEYS_KEY],
    successNotification: (_result, key) => ({
      message: 'API key revoked',
      description: `${key.name} (${key.prefix}…) no longer works.`,
    }),
    errorNotification: () => false as const,
  });
}
