// The notification log as a Refine list with a detail read: the sent notifications, newest first, a page at a time. The row opens
// in a drawer; the single-record read (`GET /:id`) adds the payload and the failure reason.
import { useList, useOne, type CrudFilters } from '@refinedev/core';
import type { NotificationLogEntry } from '../types';
import { LOG_PAGE_SIZE } from './keys';

/** The filters of a log as Refine filters; an empty text means "no filter", and `q` is the free-text search. */
function crudFilters(filters: Record<string, string>): CrudFilters {
  const out: CrudFilters = [];
  for (const [field, value] of Object.entries(filters)) {
    if (value.trim()) out.push({ field, operator: 'eq', value: value.trim() });
  }
  return out;
}

export type LogListArgs = { filters: Record<string, string>; page: number; enabled?: boolean };

/** One page of the notification log. `total` is what the server counted for the whole filter. Needs `notifications:read`. */
export function useNotificationList({ filters, page, enabled = true }: LogListArgs) {
  const { result, query } = useList<NotificationLogEntry>({
    resource: 'notifications',
    pagination: { currentPage: page, pageSize: LOG_PAGE_SIZE },
    sorters: [{ field: 'createdAt', order: 'desc' }],
    filters: crudFilters(filters),
    queryOptions: { enabled },
    errorNotification: false,
  });
  return { rows: result.data, total: result.total, query };
}

/** One notification for the drawer. The list row shows at once; the single read adds the payload and the failure reason. */
export function useNotification(id: number, row?: NotificationLogEntry) {
  const { result, query } = useOne<NotificationLogEntry>({
    resource: 'notifications',
    id,
    queryOptions: { placeholderData: row ? { data: row } : undefined },
    errorNotification: false,
  });
  return { notification: result ?? row, query };
}
