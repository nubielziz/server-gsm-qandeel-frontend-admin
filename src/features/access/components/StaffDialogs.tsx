// StaffDialogs: renders the dialog the admin tab has open (add, edit, password, suspend, the three confirms, the
// one-time password and "Block IP…"). Each dialog is mounted only while open, so it always starts with empty fields.
import { roleChangeGuard, suspendGuard } from '../lib/staffGuards';
import type { CreateStaffResult, Role, StaffMember } from '../types';
import { AddAdminDialog } from './AddAdminDialog';
import { BlockIpDialog } from './BlockIpDialog';
import { EditAdminDialog } from './EditAdminDialog';
import { PasswordDialog } from './PasswordDialog';
import { RevealPasswordDialog } from './RevealPasswordDialog';
import type { StaffDialogState } from './staffDialogState';
import { StaffConfirmDialog } from './StaffConfirmDialog';
import { SuspendDialog } from './SuspendDialog';

export interface StaffDialogsProps {
  dialog: StaffDialogState | null;
  staff: readonly StaffMember[];
  roles: readonly Role[];
  meId: number | undefined;
  /** Closes the dialog, or swaps it for another one (the one-time password after an account or password change). */
  onChange: (next: StaffDialogState | null) => void;
  /** An admin was added: open their drawer. */
  onCreated: (created: CreateStaffResult) => void;
}

/**
 * Picks the dialog for the open state and gives it the client hints it needs (who may be suspended, whose
 * role may change).
 */
export function StaffDialogs({ dialog, staff, roles, meId, onChange, onCreated }: StaffDialogsProps) {
  if (!dialog) return null;
  const close = () => onChange(null);
  switch (dialog.kind) {
    case 'add':
      return (
        <AddAdminDialog
          roles={roles}
          onClose={close}
          onCreated={(created) => {
            onCreated(created);
            onChange(
              created.temporaryPassword
                ? { kind: 'reveal', name: created.name, password: created.temporaryPassword }
                : null,
            );
          }}
        />
      );
    case 'edit':
      return (
        <EditAdminDialog
          staff={dialog.staff}
          roles={roles}
          roleGuard={roleChangeGuard({ target: dialog.staff, meId, staff, roles })}
          onClose={close}
        />
      );
    case 'password':
      return (
        <PasswordDialog
          staff={dialog.staff}
          onClose={close}
          onReveal={(name, password) => onChange({ kind: 'reveal', name, password })}
        />
      );
    case 'suspend':
      return (
        <SuspendDialog
          staff={dialog.staff}
          guard={suspendGuard({ target: dialog.staff, meId, staff, roles })}
          onClose={close}
        />
      );
    case 'signout':
    case 'reset2fa':
    case 'reactivate':
      return <StaffConfirmDialog kind={dialog.kind} staff={dialog.staff} onClose={close} />;
    case 'block-ip':
      return (
        <BlockIpDialog
          ip={dialog.staff.lastLoginIp ?? ''}
          scope="admin"
          who={dialog.staff.name}
          onClose={close}
        />
      );
    case 'reveal':
      return <RevealPasswordDialog name={dialog.name} password={dialog.password} onClose={close} />;
  }
}
