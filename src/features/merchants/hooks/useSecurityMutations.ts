// The staff security tools on a merchant, each with the toast it shows and the reads it makes stale (the merchant's record, which
// carries the Security tab's facts). The password dialog and the two confirm dialogs show a failed call themselves; "Resend
// verification email" acts at once, so the default error toast shows the server's refusal.
import { useApiMutation } from '@/lib/query';
import {
  resendClientVerification,
  resetClientTwoFactor,
  revokeClientSessions,
  setClientPassword,
} from '../api';
import type { Client, ClientPasswordBody } from '../types';
import { staleClient } from './keys';

const NO_ERROR_TOAST = () => false as const;

/** The part of a merchant the toasts and requests need. */
type Who = Pick<Client, 'id' | 'name' | 'email'>;

/**
 * Emails a link (an invitation while the merchant has no password) or sets a temporary password, returned once, optionally ending
 * every session. `gcTime: 0` drops the answer, which may hold the temporary password, as soon as the dialog is gone.
 */
export function useSetClientPassword() {
  return useApiMutation({
    mutationFn: ({ client, body }: { client: Who; body: ClientPasswordBody }) =>
      setClientPassword(client.id, body),
    gcTime: 0,
    invalidates: (_result, { client }) => staleClient(client.id),
    successNotification: (result, { client, body }) => {
      if (body.mode === 'temporary_password') {
        return {
          message: 'Temporary password set',
          description: `${client.name} must change it at next sign-in.`,
        };
      }
      return {
        message: result.link === 'invite' ? 'Invitation sent' : 'Reset link sent',
        description: `Sent to ${client.email}. The link works for 1 hour.`,
      };
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Signs a merchant out of every device. */
export function useRevokeClientSessions() {
  return useApiMutation({
    mutationFn: (client: Who) => revokeClientSessions(client.id),
    invalidates: (_result, client) => staleClient(client.id),
    successNotification: (_result, client) => ({ message: `${client.name} signed out of every device` }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Turns two-factor sign-in off and ends the merchant's sessions; the merchant is mailed a notice. */
export function useResetClientTwoFactor() {
  return useApiMutation({
    mutationFn: (client: Who) => resetClientTwoFactor(client.id),
    invalidates: (_result, client) => staleClient(client.id),
    successNotification: (_result, client) => ({
      message: `2FA reset for ${client.name}`,
      description: 'They set it up again from their portal.',
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Emails the merchant a new verification link. */
export function useResendClientVerification() {
  return useApiMutation({
    mutationFn: (client: Who) => resendClientVerification(client.id),
    invalidates: (_result, client) => staleClient(client.id),
    successNotification: (_result, client) => ({
      message: 'Verification email sent',
      description: `Sent to ${client.email}. The link works for 1 hour.`,
    }),
  });
}
