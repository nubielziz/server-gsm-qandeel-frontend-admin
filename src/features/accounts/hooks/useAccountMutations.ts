// The actions on an account, each with the toast the demo showed and the reads it makes stale. The dialogs show a failed call themselves
// (in the error slot, or under the field the server named), so none of these toasts an error unless it says so. The buttons that act at
// once (reactivate) let the default error toast show the server's refusal.
import { accountLabel, money } from '@/lib/format';
import { DASHBOARD_KEY, useApiMutation } from '@/lib/query';
import { changeAccountRank, createAccount, makeAccount, updateAccount } from '../api';
import { rankChangeParts } from '../lib/ranks';
import type {
  AccountDetails,
  AccountRow,
  CreateAccountBody,
  MakeAccountBody,
  PasswordMode,
  Rank,
} from '../types';
import { ACCOUNT_STALE_KEYS, API_KEYS_KEY, STATEMENT_KEY, staleAccount, WALLET_KEY } from './keys';
import { useRefreshOnKeyReuse } from './useKeyReuseRefresh';

const NO_ERROR_TOAST = () => false as const;

// The reads a rank change makes stale besides Refine's own: the wallet kind, the statement, the keys and the dashboard's negative wallets all
// follow the rank. They are also refreshed when the server refuses a reused key (the first press was applied).
const RANK_KEYS = [...ACCOUNT_STALE_KEYS, WALLET_KEY, STATEMENT_KEY, API_KEYS_KEY, DASHBOARD_KEY];

/** The part of an account the toasts and requests need. */
type Who = Pick<AccountRow, 'id' | 'name' | 'email'>;

/** Words for how a password was given, for the toasts. */
function passwordNote(mode: PasswordMode | undefined, email: string): string {
  return mode === 'temporary_password'
    ? 'Temporary password set. They must change it at first sign-in.'
    : `A link to set the password went to ${email}.`;
}

/**
 * Adds an account. The answer carries `temporaryPassword` once when that mode was chosen: `gcTime: 0` drops it from the cache as
 * soon as the page lets go of the mutation. The form shows a failed call itself (`EMAIL_TAKEN` under the email, the `guest` conflict).
 */
export function useCreateAccount() {
  return useApiMutation({
    mutationFn: (body: CreateAccountBody) => createAccount(body),
    gcTime: 0,
    invalidates: [{ resource: 'clients' }, { resource: 'client-groups' }],
    invalidateKeys: ACCOUNT_STALE_KEYS,
    successNotification: (created, body) => ({
      message: `${accountLabel(created)} added`,
      description: passwordNote(body.password?.mode, created.email),
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/**
 * Saves the changed details of an account (Profile part). A changed email of a login account sends a new verification link and
 * cancels the older ones; the account stays signed in. The form shows a failed call itself (`EMAIL_TAKEN` under the email field).
 */
export function useUpdateAccountDetails() {
  return useApiMutation({
    mutationFn: ({ account, body }: { account: Who; body: AccountDetails }) =>
      updateAccount(account.id, body),
    invalidates: (_updated, { account }) => staleAccount(account.id),
    invalidateKeys: ACCOUNT_STALE_KEYS,
    successNotification: (_updated, { body }) => {
      const count = Object.keys(body).length;
      return {
        message: 'Details saved',
        description: body.email
          ? `${count} ${count === 1 ? 'field' : 'fields'} saved. A new verification link went to ${body.email}.`
          : `${count} ${count === 1 ? 'field' : 'fields'} saved.`,
      };
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Pauses an account with a reason for the audit log (3 to 140 characters). They cannot sign in or order; open orders finish. */
export function useSuspendAccount() {
  return useApiMutation({
    mutationFn: ({ account, reason }: { account: Who; reason: string }) =>
      updateAccount(account.id, { status: 'suspended', reason }),
    invalidates: (_updated, { account }) => staleAccount(account.id),
    invalidateKeys: ACCOUNT_STALE_KEYS,
    successNotification: (_updated, { account }) => ({ message: `${accountLabel(account)} suspended` }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Lets a suspended account sign in and order again. */
export function useReactivateAccount() {
  return useApiMutation({
    mutationFn: (account: Who) => updateAccount(account.id, { status: 'active' }),
    invalidates: (_updated, account) => staleAccount(account.id),
    invalidateKeys: ACCOUNT_STALE_KEYS,
    successNotification: (_updated, account) => ({ message: `${accountLabel(account)} reactivated` }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/**
 * Makes an account of a guest: a link to choose a password, or a temporary password returned once (`gcTime: 0` keeps it out of the
 * cache). The dialog shows a failed call itself (`login_exists`).
 */
export function useMakeAccount() {
  return useApiMutation({
    mutationFn: ({ account, body }: { account: Who; body: MakeAccountBody }) => makeAccount(account.id, body),
    gcTime: 0,
    invalidates: (_result, { account }) => staleAccount(account.id),
    invalidateKeys: ACCOUNT_STALE_KEYS,
    successNotification: (_result, { account, body }) => ({
      message: 'Account created',
      description: passwordNote(body.mode, account.email),
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/**
 * Moves an account to another rank (Owner only). The dialog's `key` is made once per opening, so a retry changes the rank once. The
 * answer says what moved, so the toast does: the amount moved between the two wallets, the sessions ended and the API keys revoked.
 * A refusal (`RANK_CHANGE_BLOCKED`) stays in the dialog, which lists every blocker.
 */
export function useChangeRank() {
  const refreshOnReuse = useRefreshOnKeyReuse(RANK_KEYS);
  return useApiMutation({
    mutationFn: ({ account, rank, key }: { account: Who; rank: Pick<Rank, 'id' | 'name'>; key: string }) =>
      changeAccountRank(account.id, { groupId: rank.id }, key),
    invalidates: (_result, { account }) => [...staleAccount(account.id), { resource: 'client-groups' }],
    invalidateKeys: RANK_KEYS,
    successNotification: (result, { account, rank }) => ({
      message: `${accountLabel(account)} is now ${rank.name}.`,
      description: rankChangeParts(result, money).join(' ') || 'New orders use the new prices.',
    }),
    errorNotification: NO_ERROR_TOAST,
    onError: (error, { account }) => refreshOnReuse(error, account),
  });
}
