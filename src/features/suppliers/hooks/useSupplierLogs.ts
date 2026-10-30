// The API log of one supplier as a Refine list, and one call for the drawer. The list asks again every 10 seconds while the
// page is visible and the log is not paused: the real calls replace the demo's fake ones added by a timer.
import { useList, useOne } from '@refinedev/core';
import type { Id } from '@/lib/api';
import { LOG_LIMIT } from '../lib/logs';
import type { SupplierApiLog, SupplierApiLogDetail } from '../types';
import { LOG_REFRESH_MS } from './refresh';

/** The newest calls of a supplier; `total` is how many the server counted. `query` carries loading, error and refetch. */
export function useSupplierLogs(supplierId: Id | undefined, paused: boolean) {
  const { result, query } = useList<SupplierApiLog>({
    resource: 'supplier-api-logs',
    pagination: { currentPage: 1, pageSize: LOG_LIMIT },
    sorters: [{ field: 'createdAt', order: 'desc' }],
    filters: [{ field: 'supplierId', operator: 'eq', value: supplierId }],
    queryOptions: {
      enabled: supplierId !== undefined,
      refetchInterval: paused ? false : LOG_REFRESH_MS,
      // A hidden tab stops asking (React Query's default); the page shows the newest calls when it is looked at again.
      refetchIntervalInBackground: false,
    },
    errorNotification: false,
  });
  return { logs: result.data, total: result.total, query };
}

/** One call with its request and response, for the drawer. */
export function useSupplierLog(id: Id | undefined) {
  const { result, query } = useOne<SupplierApiLogDetail>({
    resource: 'supplier-api-logs',
    id,
    // No placeholder: opening another call must not show the previous call's bodies while it loads.
    queryOptions: { enabled: id !== undefined, placeholderData: undefined },
    errorNotification: false,
  });
  return { log: result, query };
}
