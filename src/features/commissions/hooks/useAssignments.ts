// The assignments as a Refine list: every agent with its plan, loaded whole (there are few). The Agents tab, the agent filter of
// the accruals and the plans' agent counts share this one read.
import { useList } from '@refinedev/core';
import type { CommissionAssignment } from '../types';
import { LIST_CAP } from './keys';

/** The assignments, newest first. */
export function useAssignments(enabled = true) {
  const { result, query } = useList<CommissionAssignment>({
    resource: 'commission-assignments',
    pagination: { currentPage: 1, pageSize: LIST_CAP },
    sorters: [{ field: 'createdAt', order: 'desc' }],
    queryOptions: { enabled },
    errorNotification: false,
  });
  return { assignments: result.data, total: result.total, query };
}
