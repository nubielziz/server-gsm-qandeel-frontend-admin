// The two actions on accruals: the bulk approval ("Approve and pay out") and "Select all", which reads every ready accrual of
// the filter so the approval can name them. The approval dialog shows a failed call itself, so no error toast is raised here.
import { useApiMutation } from '@/lib/query';
import { approveAccruals, listAccruals } from '../api';
import type { AccrualListFilters, ApproveAccrualsResult } from '../types';
import { APPROVAL_STALE_KEYS, SELECT_ALL_CAP, STALE_ACCRUALS } from './keys';

/** Approves accruals by id. The server posts the wallet entries and answers with what it paid and what it skipped. */
export function useApproveAccruals() {
  return useApiMutation<ApproveAccrualsResult, number[]>({
    mutationFn: (ids) => approveAccruals({ ids }),
    invalidates: STALE_ACCRUALS,
    invalidateKeys: APPROVAL_STALE_KEYS,
    errorNotification: () => false,
  });
}

/** Reads the accruals that match a filter (up to a cap) for "Select all N". The rows come back with how many there are in all. */
export function useReadAccruals() {
  return useApiMutation({
    mutationFn: async (filters: AccrualListFilters) => {
      const page = await listAccruals({
        start: 0,
        end: SELECT_ALL_CAP,
        sort: ['createdAt'],
        order: ['desc'],
        filters,
      });
      return { rows: page.data, total: page.total };
    },
  });
}
