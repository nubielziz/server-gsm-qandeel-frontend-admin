// AdminDetails: the facts list in the admin drawer (role, 2FA, password, last sign-in, address, devices, added).
// Ports the `dl` of adminDrawer in 56-p-access.js. The address row asks the server whether it would be refused and
// offers "Block IP…" for other people's addresses.
import { Badge, Button, Icon, KeyValue } from '@/components/ui';
import { ago, fmtDate } from '@/lib/format';
import { describeRole } from '../lib/permissions';
import { devicesText, passwordText } from '../lib/staffText';
import type { Role, StaffMember } from '../types';
import { IpVerdictChip } from './IpVerdictChip';

export interface AdminDetailsProps {
  member: StaffMember;
  roles: readonly Role[];
  isMe: boolean;
  now: number;
  /** Opens the block dialog for this admin's address; undefined hides the button (no permission). */
  onBlockIp?: () => void;
}

/**
 * The facts list of the drawer. The address row asks the server whether the address would be refused, and
 * offers "Block IP…" for other people's addresses.
 */
export function AdminDetails({ member, roles, isMe, now, onBlockIp }: AdminDetailsProps) {
  const role = roles.find((candidate) => candidate.id === member.role.id);
  const password = passwordText(member, now);
  return (
    <KeyValue
      className="mb-5"
      rows={[
        [
          'Role',
          <>
            {member.role.name}
            {role && <p className="text-xs text-ink3">{describeRole(role)}</p>}
          </>,
        ],
        [
          '2FA',
          member.twofaEnabled ? (
            <Badge tone="good" icon="shield">
              On
            </Badge>
          ) : member.status === 'invited' ? (
            <span className="text-ink3">They set it up at first sign-in</span>
          ) : (
            <Badge tone="warn" icon="alert">
              Off, new setup at next sign-in
            </Badge>
          ),
        ],
        [
          'Password',
          password.warn ? <span className="font-medium text-warn-fg">{password.text}</span> : password.text,
        ],
        [
          'Last sign-in',
          member.lastLoginAt ? ago(member.lastLoginAt, now) : <span className="text-ink3">Never</span>,
        ],
        [
          'From',
          member.lastLoginIp ? (
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="mono">{member.lastLoginIp}</span>
              <IpVerdictChip ip={member.lastLoginIp} scope="admin" />
              {!isMe && onBlockIp && (
                <Button size="sm" onClick={onBlockIp}>
                  <Icon name="ban" className="ic-xs" />
                  Block IP…
                </Button>
              )}
            </span>
          ) : (
            <span className="text-ink3">None yet</span>
          ),
        ],
        [
          'Signed in on',
          member.activeSessions ? (
            devicesText(member.activeSessions)
          ) : (
            <span className="text-ink3">No active sessions</span>
          ),
        ],
        [
          'Added',
          <>
            {fmtDate(member.createdAt)}
            {member.createdBy && <p className="text-xs text-ink3">by {member.createdBy.name}</p>}
          </>,
        ],
      ]}
    />
  );
}
