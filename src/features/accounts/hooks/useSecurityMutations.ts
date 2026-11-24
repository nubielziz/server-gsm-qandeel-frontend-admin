// The staff security tools on an account, each with the toast it shows and the reads it makes stale (the account's record, which carries
// the Security part's facts). The password dialog and the confirm dialogs show a failed call themselves; "Resend verification email"
// acts at once, so the default error toast shows the server's refusal.
import { accountLabel } from '@/lib/format';
import { useApiMutation } from '@/lib/query';
import {
  resendAccountVerification,
  resetAccountTwoFactor,
  revokeAccountSessions,
  setAccountPassword,
} from '../api';
import type { AccountPasswordBody, AccountRow } from '../types';
import { staleAccount } from './keys';

const NO_ERROR_TOAST = () => false as const;

/** The part of an account the toasts and requests need. */
type Who = Pick<AccountRow, 'id' | 'name' | 'email'>;

/**
 * Emails a link (an invitation while the account has no password) or sets a temporary password, returned once, optionally ending every
 * session. `gcTime: 0` drops the answer, which may hold the temporary password, as soon as the dialog is gone.
 */
export function useSetAccountPassword() {
  return useApiMutation({
    mutationFn: ({ account, body }: { account: Who; body: AccountPasswordBody }) =>
      setAccountPassword(account.id, body),
    gcTime: 0,
    invalidates: (_result, { account }) => staleAccount(account.id),
    successNotification: (result, { account, body }) => {
      if (body.mode === 'temporary_password') {
        return {
          message: 'Temporary password set',
          description: `${accountLabel(account)} must change it at next sign-in.`,
        };
      }
      return {
        message: result.link === 'invite' ? 'Invitation sent' : 'Reset link sent',
        description: `Sent to ${account.email}. The link works for 1 hour.`,
      };
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Signs an account out of every device. */
export function useRevokeAccountSessions() {
  return useApiMutation({
    mutationFn: (account: Who) => revokeAccountSessions(account.id),
    invalidates: (_result, account) => staleAccount(account.id),
    successNotification: (_result, account) => ({
      message: `${accountLabel(account)} signed out of every device`,
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Turns two-step sign-in off and ends the account's sessions; the person is mailed a notice. */
export function useResetAccountTwoFactor() {
  return useApiMutation({
    mutationFn: (account: Who) => resetAccountTwoFactor(account.id),
    invalidates: (_result, account) => staleAccount(account.id),
    successNotification: (_result, account) => ({
      message: `Two-step sign-in reset for ${accountLabel(account)}`,
      description: 'They set it up again at the next sign-in.',
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Emails the account a new verification link. */
export function useResendAccountVerification() {
  return useApiMutation({
    mutationFn: (account: Who) => resendAccountVerification(account.id),
    invalidates: (_result, account) => staleAccount(account.id),
    successNotification: (_result, account) => ({
      message: 'Verification email sent',
      description: `Sent to ${account.email}. The link works for 1 hour.`,
    }),
  });
}
