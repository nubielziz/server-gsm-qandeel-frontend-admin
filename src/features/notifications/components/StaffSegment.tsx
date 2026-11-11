// StaffSegment: the staff group of the audience: every active staff member, or only those of some roles (the roles come from `GET /admin/roles`).
import { useRoleOptions } from '../hooks/useAudienceOptions';
import type { BroadcastGrants } from '../hooks/useBroadcastGrants';
import type { AudienceForm } from '../lib/spec';
import { CheckList } from './CheckList';
import { SegmentCard } from './SegmentCard';

export interface SegmentProps {
  audience: AudienceForm;
  onChange: (audience: AudienceForm) => void;
  grants: BroadcastGrants;
  errors: Record<string, string>;
}

export function StaffSegment({ audience, onChange, grants }: SegmentProps) {
  const { staff } = audience;
  const canRead = grants.can('roles:read');
  const roles = useRoleOptions(staff.on && canRead);
  const options = roles.options.map((role) => ({ value: role.id, label: role.name }));
  return (
    <SegmentCard
      title="Staff"
      description="Active staff members of the console."
      on={staff.on}
      onToggle={(on) => onChange({ ...audience, staff: { ...staff, on } })}
    >
      <CheckList
        legend="Only these roles"
        options={options}
        selected={staff.roleIds}
        emptyMeans="Every role."
        unavailable={
          !canRead
            ? 'You need the roles:read permission to pick roles. Without it, every role is included.'
            : roles.query.isError
              ? 'Could not load the roles.'
              : undefined
        }
        onChange={(roleIds) => onChange({ ...audience, staff: { ...staff, roleIds } })}
      />
    </SegmentCard>
  );
}
