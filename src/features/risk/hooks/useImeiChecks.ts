// The IMEI check log as Refine reads: one page of the rows that match the toolbar, one check for the details drawer, and the
// four figures above the table. Ports the data side of `checkRows` and `tabChecks` in 54-p-risk.js.
import { useList, useOne } from '@refinedev/core';
import { useQueries } from '@tanstack/react-query';
import type { SortState } from '@/components/ui';
import { listImeiChecks } from '../api';
import { toRefineFilters } from '../lib/view';
import type { ImeiCheck, ImeiCheckFilters } from '../types';
import { IMEI_COUNTS_KEY, REFRESH_MS } from './keys';

export type ImeiChecksArgs = {
  filters: ImeiCheckFilters;
  page: number;
  pageSize: number;
  sort: SortState;
};

/** `checks` is the page, `total` what the server counted for the whole filter; `query` carries loading, error and refetch. */
export function useImeiChecksList({ filters, page, pageSize, sort }: ImeiChecksArgs) {
  const { result, query } = useList<ImeiCheck>({
    resource: 'imei-checks',
    pagination: { currentPage: page, pageSize },
    sorters: [{ field: sort.field, order: sort.order }],
    filters: toRefineFilters({ ...filters }),
    // The table shows its own error state with Retry, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { checks: result.data, total: result.total, query };
}

/** One check for the drawer. `row` is the list row, shown at once while the single read loads; a deep link has none. */
export function useImeiCheck(id: number, row?: ImeiCheck) {
  const { result, query } = useOne<ImeiCheck>({
    resource: 'imei-checks',
    id,
    queryOptions: { placeholderData: row ? { data: row } : undefined },
    errorNotification: false,
  });
  return { check: result ?? row, query };
}

export type ImeiCounts = {
  all: number | undefined;
  free: number | undefined;
  preOrder: number | undefined;
  blacklisted: number | undefined;
};

// The figures are counts only: the list answers a page and a total, not sums (see the mismatch row in HANDOFF.md).
const SPECS: readonly { id: keyof ImeiCounts; filters: ImeiCheckFilters }[] = [
  { id: 'all', filters: {} },
  { id: 'free', filters: { source: 'storefront_free' } },
  { id: 'preOrder', filters: { source: 'pre_order' } },
  { id: 'blacklisted', filters: { status: 'blacklisted' } },
];

/** Each figure is the list call with `_start=0&_end=1`, read from `x-total-count`, so the server does the counting. */
export function useImeiCounts(): ImeiCounts {
  const results = useQueries({
    queries: SPECS.map((spec) => ({
      queryKey: [...IMEI_COUNTS_KEY, spec.id],
      queryFn: async ({ signal }: { signal: AbortSignal }) =>
        (await listImeiChecks({ start: 0, end: 1, filters: { ...spec.filters } }, { signal })).total,
      refetchInterval: REFRESH_MS,
    })),
  });
  const countOf = (id: keyof ImeiCounts) => results[SPECS.findIndex((spec) => spec.id === id)]?.data;
  return {
    all: countOf('all'),
    free: countOf('free'),
    preOrder: countOf('preOrder'),
    blacklisted: countOf('blacklisted'),
  };
}
