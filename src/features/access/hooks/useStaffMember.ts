// One admin account for the drawer. The row from the list shows at once; the single-account read replaces it with the
// fresher answer, and stays fresh after an action (the actions invalidate both).
import { useOne } from '@refinedev/core';
import type { StaffMember } from '../types';

/**
 * The account for the drawer: the list row at once, then the single-account read when it arrives.
 */
export function useStaffMember(row: StaffMember) {
  const { result, query } = useOne<StaffMember>({
    resource: 'staff',
    id: row.id,
    queryOptions: { placeholderData: { data: row } },
    errorNotification: false,
  });
  return { member: result ?? row, query };
}
