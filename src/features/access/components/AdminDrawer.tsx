// AdminDrawer: the side sheet of one admin (the demo's `ad-open` action and adminDrawer in 56-p-access.js): status banner,
// facts, the manage buttons, and Suspend or Reactivate in the footer. Suspending yourself or the last Owner is disabled
// with the reason shown; the server enforces the same rules.
import { Button, Drawer, Icon, TypeTag } from '@/components/ui';
import { ago } from '@/lib/format';
import { useAccessGrants } from '../hooks/useAccessGrants';
import { useStaffMember } from '../hooks/useStaffMember';
import { suspendGuard } from '../lib/staffGuards';
import { joinText } from '../lib/staffText';
import type { Role, StaffMember } from '../types';
import { AdminActions } from './AdminActions';
import { AdminDetails } from './AdminDetails';
import type { StaffDialogState } from './staffDialogState';
import { StaffStatusBadge } from './StaffStatusBadge';

// The note at the top of the drawer for an account that is suspended or has not signed in yet.
function Banner({ member, now }: { member: StaffMember; now: number }) {
  if (member.status === 'suspended') {
    return (
      <div className="mb-4 flex gap-2.5 rounded-lg bg-warn-bg p-3 text-warn-fg" role="note">
        <Icon name="pause" className="mt-px" />
        <div className="text-sm">
          <p className="font-medium">Suspended {ago(member.suspendedAt, now)}</p>
          {member.suspendedReason && <p className="mt-0.5">{member.suspendedReason}</p>}
          <p className="mt-1.5 text-xs">
            They cannot sign in and every session was ended. Reactivate to let them back in.
          </p>
        </div>
      </div>
    );
  }
  if (member.status === 'invited') {
    return (
      <div className="mb-4 flex gap-2.5 rounded-lg bg-sunken p-3 text-ink2" role="note">
        <Icon name="clock" className="mt-px" />
        <p className="text-sm">{joinText(member, now)}</p>
      </div>
    );
  }
  return null;
}

export interface AdminDrawerProps {
  /** The account as the list has it; the drawer refreshes it with a single-account read. */
  row: StaffMember;
  staff: readonly StaffMember[];
  roles: readonly Role[];
  now: number;
  onClose: () => void;
  onAction: (dialog: StaffDialogState) => void;
}

/**
 * The side sheet of one admin. It reads the account again so it stays fresh after an action, and opens
 * every dialog through `onAction`.
 */
export function AdminDrawer({ row, staff, roles, now, onClose, onAction }: AdminDrawerProps) {
  const grants = useAccessGrants();
  const { member } = useStaffMember(row);
  const isMe = member.id === grants.me?.id;
  const suspend = suspendGuard({ target: member, meId: grants.me?.id, staff, roles });
  const lock = grants.needs('staff:suspend');
  const blockLock = grants.needs('access:create');

  return (
    <Drawer
      open
      onClose={onClose}
      title={member.name}
      sub={member.email}
      badges={
        <>
          <StaffStatusBadge status={member.status} />
          <TypeTag>{member.role.name}</TypeTag>
          {isMe && <TypeTag>You</TypeTag>}
        </>
      }
      footer={
        <>
          {member.status === 'suspended' ? (
            <Button
              variant="primary"
              disabled={lock.disabled}
              title={lock.title}
              onClick={() => onAction({ kind: 'reactivate', staff: member })}
            >
              <Icon name="checkCircle" className="ic-sm" />
              Reactivate
            </Button>
          ) : (
            <Button
              variant="danger"
              disabled={lock.disabled || !suspend.ok}
              title={lock.title ?? (suspend.ok ? undefined : suspend.reason)}
              onClick={() => onAction({ kind: 'suspend', staff: member })}
            >
              <Icon name="pause" className="ic-sm" />
              Suspend…
            </Button>
          )}
          <span className="flex-1" />
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <Banner member={member} now={now} />
      <AdminDetails
        member={member}
        roles={roles}
        isMe={isMe}
        now={now}
        onBlockIp={blockLock.disabled ? undefined : () => onAction({ kind: 'block-ip', staff: member })}
      />
      <AdminActions member={member} grants={grants} onAction={onAction} />
      {member.status !== 'suspended' && !suspend.ok && (
        <p className="mt-3 text-xs text-ink3">{suspend.reason}</p>
      )}
    </Drawer>
  );
}
