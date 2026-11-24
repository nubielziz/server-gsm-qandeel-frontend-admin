// An account's API keys and the actions on them: revoke, create one for an active account with a merchant rank (the Owner only), change a
// key's limits. The demo's "Rotate key" has no admin route (MISMATCHES M45).
import { accountLabel } from '@/lib/format';
import { useApiMutation, useApiQuery } from '@/lib/query';
import { createAccountApiKey, listAccountApiKeys, revokeApiKey, updateApiKey } from '../api';
import type { AccountRow, ApiKey, CreateApiKeyBody, UpdateApiKeyBody } from '../types';
import { API_KEYS_KEY } from './keys';

/** The keys of one account. Pass `enabled: false` while the staff member lacks `api_keys:read` or the rank is not a merchant rank. */
export function useAccountApiKeys(accountId: number, enabled = true) {
  return useApiQuery({
    queryKey: [...API_KEYS_KEY, accountId],
    queryFn: ({ signal }) => listAccountApiKeys(accountId, { signal }),
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
 * Creates a key for an active account. The answer carries the full key once: `gcTime: 0` drops it from the query cache as soon as the
 * dialog is gone, and the page keeps it only in the one-time dialog's state. The dialog shows a failed call itself.
 */
export function useCreateAccountApiKey() {
  return useApiMutation({
    mutationFn: ({
      account,
      body,
    }: {
      account: Pick<AccountRow, 'id' | 'name' | 'email'>;
      body: CreateApiKeyBody;
    }) => createAccountApiKey(account.id, body),
    gcTime: 0,
    invalidateKeys: [API_KEYS_KEY],
    successNotification: (_created, { account, body }) => ({
      message: 'API key created',
      description: `${body.name} for ${accountLabel(account)}. They are emailed a notice.`,
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
