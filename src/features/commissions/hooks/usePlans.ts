// The commission plans as a Refine list, loaded whole (there are few): the Plans tab and the plan menus of the dialogs.
import { useList } from '@refinedev/core';
import type { CommissionPlan } from '../types';
import { LIST_CAP } from './keys';

/** The plans in the order they were made. */
export function usePlans(enabled = true) {
  const { result, query } = useList<CommissionPlan>({
    resource: 'commission-plans',
    pagination: { currentPage: 1, pageSize: LIST_CAP },
    sorters: [{ field: 'id', order: 'asc' }],
    queryOptions: { enabled },
    errorNotification: false,
  });
  return { plans: result.data, total: result.total, query };
}
