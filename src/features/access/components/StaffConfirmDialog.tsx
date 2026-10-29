// StaffConfirmDialog: the review step before three account actions: "Sign <name> out everywhere?" (`ad-signout`),
// "Reset 2FA for <name>?" (`ad-2fa`) and "Reactivate <name>?" (`ad-reactivate`). A failed call shows in the dialog.
import { ConfirmDialog } from '@/components/ui';
import {
  useReactivateStaff,
  useResetStaffTwoFactor,
  useRevokeStaffSessions,
} from '../hooks/useStaffMutations';
import { devicesText } from '../lib/staffText';
import type { StaffMember } from '../types';

export interface StaffConfirmDialogProps {
  kind: 'signout' | 'reset2fa' | 'reactivate';
  staff: StaffMember;
  onClose: () => void;
}

/**
 * One review dialog for the three account actions that need no input: sign out everywhere, reset 2FA and
 * reactivate.
 */
export function StaffConfirmDialog({ kind, staff, onClose }: StaffConfirmDialogProps) {
  const signOut = useRevokeStaffSessions();
  const resetTwoFactor = useResetStaffTwoFactor();
  const reactivate = useReactivateStaff();

  if (kind === 'signout') {
    return (
      <ConfirmDialog
        open
        title={`Sign ${staff.name} out everywhere?`}
        body={
          <p>
            They are signed out of {devicesText(staff.activeSessions)} right away and must sign in again with
            their password and 2FA code.
          </p>
        }
        confirm="Sign out"
        onClose={onClose}
        onConfirm={() => signOut.mutateAsync(staff).then(() => undefined)}
      />
    );
  }
  if (kind === 'reset2fa') {
    return (
      <ConfirmDialog
        open
        title={`Reset 2FA for ${staff.name}?`}
        body={
          <p>
            Use this when they lost their phone. The old authenticator stops working and they set up a new one
            at their next sign-in. Check it is really them first.
          </p>
        }
        confirm="Reset 2FA"
        kind="danger"
        onClose={onClose}
        onConfirm={() => resetTwoFactor.mutateAsync(staff).then(() => undefined)}
      />
    );
  }
  return (
    <ConfirmDialog
      open
      title={`Reactivate ${staff.name}?`}
      body={<p>They can sign in again with their existing password and 2FA.</p>}
      confirm="Reactivate"
      onClose={onClose}
      onConfirm={() => reactivate.mutateAsync(staff).then(() => undefined)}
    />
  );
}
