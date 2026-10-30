// The log of sent notifications (`/admin/notifications*`): the Notification log tab, a tab the demo lacks. Read-only. The map
// gives no bodies (MISMATCHES M10), so shapes are assumed contracts. Needs `notifications:read`.
import { apiGet, apiList, pathOf, type ApiInit, type Id, type ListQuery, type ListResult } from '@/lib/api';
import type { NotificationLogEntry } from '../types';

/**
 * The notifications that were sent (or tried), newest first with `_sort=createdAt&_order=desc`. Filters: `status`, `channel`, `event`.
 * Assumed contract: rows carry `recipient` already masked by the server.
 * @route GET /admin/notifications
 */
export function listNotifications(
  query: ListQuery = {},
  init?: ApiInit,
): Promise<ListResult<NotificationLogEntry>> {
  return apiList<NotificationLogEntry>('/admin/notifications', query, undefined, init);
}

/**
 * One notification with its data (`payload`) and, if it failed, the reason (`error`).
 * Assumed contract: same fields as a list row.
 * @route GET /admin/notifications/:id
 */
export function getNotification(id: Id, init?: ApiInit): Promise<NotificationLogEntry> {
  return apiGet<NotificationLogEntry>(pathOf('/admin/notifications/:id', { id }), undefined, init);
}
