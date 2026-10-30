// The people a ticket can be assigned to: the staff list when the signed-in member may read it, else only themselves and the
// current assignee. The list is short and shared with the Admins page through Refine's cache.
import { useMemo } from 'react';
import { useStaffList } from '@/features/access';
import type { SelectOption } from '@/components/ui';
import { assigneeOptions } from '../lib/assignees';
import type { StaffRef } from '../types';
import type { SupportGrants } from './useSupportGrants';

export function useAssignees(grants: SupportGrants, current: StaffRef | null): SelectOption[] {
  const { staff } = useStaffList({ enabled: grants.can('staff:read') && grants.can('support:update') });
  const me = grants.me;
  return useMemo(
    () => assigneeOptions(staff, me ? { id: me.id, name: me.name } : undefined, current),
    [staff, me, current],
  );
}
