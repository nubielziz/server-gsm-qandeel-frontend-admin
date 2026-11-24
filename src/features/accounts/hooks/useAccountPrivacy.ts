// The privacy side of an account: the read (consents, risk) and the actions (block, unblock, export, anonymize), each with its toast and
// the reads it makes stale. Export and anonymize can close a matching data request on the server, so the requests refresh too, and an
// anonymized account changes its orders (the IMEIs are cut, the buyer is replaced), so the orders refresh as well.
import { accountLabel } from '@/lib/format';
import { useApiMutation, useApiQuery, type InvalidateTarget } from '@/lib/query';
import { anonymizeAccount, blockAccount, exportAccountData, getAccountPrivacy } from '../api';
import type { AccountRow } from '../types';
import { ACCOUNT_STALE_KEYS, PRIVACY_KEY, REQUEST_STALE_KEYS, staleAccount } from './keys';

const NO_ERROR_TOAST = () => false as const;

/** The part of an account the toasts and requests need. */
type Who = Pick<AccountRow, 'id' | 'name' | 'email'>;

const staleRequests = (): InvalidateTarget[] => [{ resource: 'data-requests' }];

/** The marketing choice, the latest consent records and the risk summary of one account. Pass `enabled: false` without `clients:read`. */
export function useAccountPrivacy(accountId: number, enabled = true) {
  return useApiQuery({
    queryKey: [...PRIVACY_KEY, accountId],
    queryFn: ({ signal }) => getAccountPrivacy(accountId, { signal }),
    enabled,
  });
}

/** Blocks an account for fraud, with a reason. The dialog shows a refusal itself. */
export function useBlockAccount() {
  return useApiMutation({
    mutationFn: ({ account, reason }: { account: Who; reason: string }) =>
      blockAccount(account.id, { blocked: true, reason }),
    invalidates: (_result, { account }) => staleAccount(account.id),
    invalidateKeys: [...ACCOUNT_STALE_KEYS, PRIVACY_KEY],
    successNotification: (_result, { account }) => ({
      message: `${accountLabel(account)} blocked`,
      description: 'Added to the blocklist.',
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Lifts a block; only what the block added to the blocklist is removed. */
export function useUnblockAccount() {
  return useApiMutation({
    mutationFn: (account: Who) => blockAccount(account.id, { blocked: false }),
    invalidates: (_result, account) => staleAccount(account.id),
    invalidateKeys: [...ACCOUNT_STALE_KEYS, PRIVACY_KEY],
    successNotification: (_result, account) => ({ message: `${accountLabel(account)} unblocked` }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Downloads the account's data as a JSON file. The confirm dialog shows a refusal. */
export function useExportAccountData() {
  return useApiMutation({
    mutationFn: (account: Pick<AccountRow, 'id'>) => exportAccountData(account.id),
    invalidates: staleRequests,
    invalidateKeys: REQUEST_STALE_KEYS,
    successNotification: (file) => ({
      message: 'Data exported',
      description: `${file}. Any open export request is marked done.`,
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/**
 * Anonymizes an account of the retail rank. The confirm dialog shows a refusal. The server also cuts the IMEIs and replaces the buyer
 * on the account's orders, and may close its open erasure request, so the orders and the requests refresh too.
 */
export function useAnonymizeAccount() {
  return useApiMutation({
    mutationFn: (account: Pick<AccountRow, 'id'>) => anonymizeAccount(account.id),
    invalidates: (_result, account) => [
      ...staleAccount(account.id),
      ...staleRequests(),
      { resource: 'orders' },
    ],
    invalidateKeys: [...REQUEST_STALE_KEYS, PRIVACY_KEY],
    successNotification: () => ({
      message: 'Account anonymized',
      description: 'Any open erasure request is marked done.',
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}
