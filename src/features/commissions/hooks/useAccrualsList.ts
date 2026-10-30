// The accruals as a Refine list: one page of the rows that match the status and agent, sorted by the server. Ports the data side of
// accrualsTab / accrualRows in 46-p-commissions.js.
import { useList } from '@refinedev/core';
import type { SortState } from '@/components/ui';
import { toRefineFilters } from '../lib/filters';
import type { AccrualListFilters, CommissionAccrual } from '../types';

/** What `useAccrualsList` asks the server for. */
export type AccrualsListArgs = {
  filters: AccrualListFilters;
  page: number;
  pageSize: number;
  sort: SortState;
  enabled?: boolean;
};

/** `accruals` is the page, `total` what the server counted for the whole filter; `query` carries loading, error and refetch. */
export function useAccrualsList({ filters, page, pageSize, sort, enabled = true }: AccrualsListArgs) {
  const { result, query } = useList<CommissionAccrual>({
    resource: 'commission-accruals',
    pagination: { currentPage: page, pageSize },
    sorters: [{ field: sort.field, order: sort.order }],
    filters: toRefineFilters(filters),
    queryOptions: { enabled },
    // The table shows its own error state with Retry, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { accruals: result.data, total: result.total, query };
}
