// The staff member's own inbox (`/admin/inbox*`): the list the bell opens, the unread count, and the two ways to mark items read. A staff member's
// own read state, never audited. These routes are backend additions (HANDOFF NOTIF-1). The answers are personal: they are never cached long.
import {
  apiGet,
  apiList,
  apiPost,
  pathOf,
  type ApiInit,
  type Id,
  type ListQuery,
  type ListResult,
} from '@/lib/api';
import type { InboxCategory, InboxItem, ReadAllBody, ReadAllResult, UnreadCount } from '../types';

/** The inbox's own query: the usual range and sort plus `unread` (only the unread ones). */
export type InboxQuery = ListQuery & { unread?: boolean; category?: InboxCategory };

/**
 * The signed-in staff member's notifications, newest first; `_start`/`_end` page through them (up to 100 a page). `unread: true` shows only
 * the unread ones. Items of a cancelled broadcast are hidden by the server.
 * @route GET /admin/inbox
 */
export function listInbox(
  { unread, category, ...query }: InboxQuery = {},
  init?: ApiInit,
): Promise<ListResult<InboxItem>> {
  return apiList<InboxItem>(
    '/admin/inbox',
    { ...query, filters: { ...query.filters, category } },
    { unread },
    init,
  );
}

/**
 * How many notifications are unread, capped at 100 by the server (show "99+").
 * @route GET /admin/inbox/unread-count
 */
export function getUnreadCount(init?: ApiInit): Promise<UnreadCount> {
  return apiGet<UnreadCount>('/admin/inbox/unread-count', undefined, init);
}

/**
 * Marks one of the staff member's notifications read. Repeating it is fine; another person's id is a 404.
 * @route POST /admin/inbox/:id/read
 */
export function markInboxRead(id: Id, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/inbox/:id/read', { id }), undefined, init);
}

/**
 * Marks the unread notifications read, up to `upToId` when given (the newest id on screen), so an item that arrives during the click stays unread.
 * Answers how many it marked.
 * @route POST /admin/inbox/read-all
 */
export function markAllInboxRead(body: ReadAllBody = {}, init?: ApiInit): Promise<ReadAllResult> {
  return apiPost<ReadAllResult>('/admin/inbox/read-all', body, init);
}
