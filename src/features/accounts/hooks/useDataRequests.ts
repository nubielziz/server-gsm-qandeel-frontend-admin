// The data requests as a Refine list: one page of them for the Data requests view, or one account's requests (a filter on `accountId`)
// for its Privacy and risk part, the open count of the link, and the moves of a request. Needs `customers:privacy`, so callers pass
// `enabled`.
import { useList } from '@refinedev/core';
import type { SortState } from '@/components/ui';
import { requestNumber } from '../lib/requests';
import { useApiMutation, useApiQuery, type InvalidateTarget } from '@/lib/query';
import { listDataRequests, updateDataRequest } from '../api';
import { toListQuery, toRefineFilters } from '../lib/filters';
import type { DataRequest, DataRequestFilters, DataRequestStatus, UpdateDataRequestBody } from '../types';
import { REFRESH_MS, REQUEST_COUNT_KEY, REQUEST_STALE_KEYS } from './keys';

export type DataRequestsArgs = {
  filters?: DataRequestFilters;
  page: number;
  pageSize: number;
  sort: SortState;
  enabled?: boolean;
};

/** `requests` is the page, `total` what the server counted for the whole filter; `query` carries loading, error and refetch. */
export function useDataRequests({ filters = {}, page, pageSize, sort, enabled = true }: DataRequestsArgs) {
  const { result, query } = useList<DataRequest>({
    resource: 'data-requests',
    pagination: { currentPage: page, pageSize },
    sorters: [{ field: sort.field, order: sort.order }],
    filters: toRefineFilters(filters),
    queryOptions: { enabled },
    // The table shows its own error state with Retry, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { requests: result.data, total: result.total, query };
}

/** The requests still to do: what the Data requests link counts and what its view lists first. */
export const PENDING_REQUEST_STATUSES: DataRequestStatus[] = ['open', 'in_progress'];

/** How many requests are still to do (open and in progress), for the link. Pass `enabled: false` without `customers:privacy`. */
export function useOpenRequestCount(enabled = true) {
  return useApiQuery({
    queryKey: REQUEST_COUNT_KEY,
    queryFn: async ({ signal }) =>
      (
        await listDataRequests(toListQuery({ status: PENDING_REQUEST_STATUSES }, { start: 0, end: 1 }), {
          signal,
        })
      ).total,
    enabled,
    refetchInterval: REFRESH_MS,
  });
}

const staleRequests = (): InvalidateTarget[] => [{ resource: 'data-requests' }];

// What the toast says happened to the request.
const MOVED: Record<Exclude<DataRequestStatus, 'open'>, string> = {
  in_progress: 'is in progress',
  completed: 'is done',
  rejected: 'was rejected',
};

/**
 * Moves a data request along. `toastErrors` is false for the Reject dialog, which shows a refusal itself; the row buttons have no
 * dialog, so their failures show as a toast.
 */
export function useUpdateDataRequest({ toastErrors = true }: { toastErrors?: boolean } = {}) {
  return useApiMutation({
    mutationFn: ({ request, body }: { request: Pick<DataRequest, 'id'>; body: UpdateDataRequestBody }) =>
      updateDataRequest(request.id, body),
    invalidates: staleRequests,
    invalidateKeys: REQUEST_STALE_KEYS,
    successNotification: (_updated, { request, body }) => ({
      message: `${requestNumber(request.id)} ${MOVED[body.status]}`,
    }),
    errorNotification: toastErrors ? undefined : () => false as const,
  });
}
