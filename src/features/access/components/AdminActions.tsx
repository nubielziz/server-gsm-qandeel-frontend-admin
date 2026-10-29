// AdminActions: the "Manage the account" buttons of the admin drawer (edit, password, sign out everywhere, reset 2FA)
// and the reminder that passwords are never readable. Ports the end of adminDrawer in 56-p-access.js.
import { Button, Icon } from '@/components/ui';
import type { AccessGrants } from '../hooks/useAccessGrants';
import type { StaffMember } from '../types';
import type { StaffDialogState } from './staffDialogState';

export interface AdminActionsProps {
  member: StaffMember;
  grants: AccessGrants;
  onAction: (dialog: StaffDialogState) => void;
}

/**
 * The four account actions of the drawer. All need `staff:update`; signing out and resetting 2FA are off
 * when there is nothing to end or reset.
 */
export function AdminActions({ member, grants, onAction }: AdminActionsProps) {
  const lock = grants.needs('staff:update');
  const open = (kind: 'edit' | 'password' | 'signout' | 'reset2fa') => () =>
    onAction({ kind, staff: member });
  return (
    <>
      <h3 className="mb-2 text-xs font-medium text-ink3">Manage the account</h3>
      <div className="flex flex-wrap gap-2">
        <Button disabled={lock.disabled} title={lock.title} onClick={open('edit')}>
          <Icon name="edit" className="ic-sm" />
          Edit details
        </Button>
        <Button disabled={lock.disabled} title={lock.title} onClick={open('password')}>
          <Icon name="lock" className="ic-sm" />
          Password…
        </Button>
        <Button
          disabled={lock.disabled || member.activeSessions === 0}
          title={lock.title}
          onClick={open('signout')}
        >
          <Icon name="upload" className="ic-sm" />
          Sign out everywhere
        </Button>
        <Button
          disabled={lock.disabled || !member.twofaEnabled}
          title={lock.title}
          onClick={open('reset2fa')}
        >
          <Icon name="shield" className="ic-sm" />
          Reset 2FA…
        </Button>
      </div>
      <p className="mt-4 rounded-md bg-sunken p-3 text-xs text-ink2">
        You can replace a password but never read it. Passwords are never written to the audit log.
      </p>
    </>
  );
}
