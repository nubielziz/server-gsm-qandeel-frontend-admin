// MerchantConfirmDialog: the review step before two actions that need no input: "Sign <merchant> out everywhere?" and "Reset 2FA for
// <merchant>?". A failed call (a 409 from the server) shows in the dialog.
import { ConfirmDialog } from '@/components/ui';
import { useResetClientTwoFactor, useRevokeClientSessions } from '../hooks/useSecurityMutations';
import type { Client } from '../types';

export interface MerchantConfirmDialogProps {
  kind: 'signout' | 'reset2fa';
  client: Client;
  onClose: () => void;
}

export function MerchantConfirmDialog({ kind, client, onClose }: MerchantConfirmDialogProps) {
  const signOut = useRevokeClientSessions();
  const reset = useResetClientTwoFactor();
  if (kind === 'signout') {
    const count = client.security?.activeSessions ?? 0;
    return (
      <ConfirmDialog
        open
        title={`Sign ${client.name} out everywhere?`}
        body={
          <p>
            They are signed out of {count} {count === 1 ? 'session' : 'sessions'}, a sign-in step in progress
            included, and can sign in again with their password. They are not emailed.
          </p>
        }
        confirm="Sign out"
        onClose={onClose}
        onConfirm={() => signOut.mutateAsync(client).then(() => undefined)}
      />
    );
  }
  return (
    <ConfirmDialog
      open
      title={`Reset 2FA for ${client.name}?`}
      body={
        <p>
          Two-factor sign-in is turned off and every session of theirs ends. They are emailed a security
          notice and set 2FA up again from their portal.
        </p>
      }
      confirm="Reset 2FA"
      kind="danger"
      onClose={onClose}
      onConfirm={() => reset.mutateAsync(client).then(() => undefined)}
    />
  );
}
