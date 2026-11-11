// A merchant's API keys and the actions on them: revoke, create one for an active merchant, change a key's limits. The demo's
// "Rotate key" has no admin route (MISMATCHES M45); feature 20 adds creating a key and its limits.
import { useApiMutation, useApiQuery } from '@/lib/query';
import { createClientApiKey, listClientApiKeys, revokeApiKey, updateApiKey } from '../api';
import type { ApiKey, Client, CreateApiKeyBody, UpdateApiKeyBody } from '../types';
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

/**
 * Creates a key for an active merchant. The answer carries the full key once: `gcTime: 0` drops it from the query cache as soon
 * as the dialog is gone, and the page keeps it only in the one-time dialog's state. The dialog shows a failed call itself.
 */
export function useCreateClientApiKey() {
  return useApiMutation({
    mutationFn: ({ client, body }: { client: Pick<Client, 'id' | 'name'>; body: CreateApiKeyBody }) =>
      createClientApiKey(client.id, body),
    gcTime: 0,
    invalidateKeys: [API_KEYS_KEY],
    successNotification: (_created, { client, body }) => ({
      message: 'API key created',
      description: `${body.name} for ${client.name}. The merchant is emailed a notice.`,
    }),
    errorNotification: () => false as const,
  });
}

/** Saves a key's per-minute limit and allowed addresses; the row updates and the key follows them on its next call. */
export function useUpdateApiKey() {
  return useApiMutation({
    mutationFn: ({ key, body }: { key: Pick<ApiKey, 'id' | 'name' | 'prefix'>; body: UpdateApiKeyBody }) =>
      updateApiKey(key.id, body),
    invalidateKeys: [API_KEYS_KEY],
    successNotification: (_updated, { key }) => ({
      message: 'Limits saved',
      description: `${key.name} (${key.prefix}…) uses them from its next call.`,
    }),
    errorNotification: () => false as const,
  });
}
