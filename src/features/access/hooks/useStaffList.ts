// The admin accounts as a Refine list. The list is short, so it is loaded whole and the page draws the figures, the
// sorting and the filters itself.
import { useList } from '@refinedev/core';
import type { StaffMember } from '../types';

/** Most rows one of these short lists loads. If the server has more, the screen says so. */
export const LIST_CAP = 200;

/** `staff` is the loaded accounts, `total` what the server counted; `query` carries loading, error and refetch. */
export function useStaffList(options: { enabled?: boolean } = {}) {
  const { result, query } = useList<StaffMember>({
    resource: 'staff',
    pagination: { currentPage: 1, pageSize: LIST_CAP },
    queryOptions: { enabled: options.enabled ?? true },
    // The tab shows its own error state with Retry, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { staff: result.data, total: result.total, query };
}
