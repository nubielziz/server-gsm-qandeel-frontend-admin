// The bell's list: the newest 20 items, 20 more on each "Load more", with an "Unread only" switch. It asks only while the panel is open. The two actions
// (mark one read, mark all read) refresh the list and the bell's number.
import { useOnError } from '@refinedev/core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useApiMutation } from '@/lib/query';
import { listInbox, markAllInboxRead, markInboxRead } from '../api';
import { INBOX_KEY, INBOX_PAGE_SIZE, UNREAD_KEY } from './keys';

/** The items loaded so far (newest first), whether more exist, and the controls of the list. Pass `open` so a closed bell asks nothing. */
export function useInbox(options: { open: boolean; unreadOnly: boolean }) {
  const { mutate: checkError } = useOnError();
  const query = useInfiniteQuery({
    queryKey: [...INBOX_KEY, options.unreadOnly ? 'unread' : 'all'],
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }: { pageParam: number; signal: AbortSignal }) => {
      const { data, total } = await listInbox(
        { start: pageParam, end: pageParam + INBOX_PAGE_SIZE, unread: options.unreadOnly || undefined },
        { signal },
      );
      return { rows: data, total };
    },
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((sum, page) => sum + page.rows.length, 0);
      return last.rows.length === INBOX_PAGE_SIZE && loaded < last.total ? loaded : undefined;
    },
    enabled: options.open,
    staleTime: 0,
    retry: false,
  });
  const error = query.error;
  useEffect(() => {
    if (error) checkError(error);
  }, [error, checkError]);
  const items = query.data?.pages.flatMap((page) => page.rows) ?? [];
  return { items, query };
}

/** Marks one item read; the bell's number and the list refresh. */
export function useMarkRead() {
  return useApiMutation({
    mutationFn: (id: number) => markInboxRead(id),
    invalidateKeys: [UNREAD_KEY, INBOX_KEY],
    errorNotification: (error) => ({
      message: 'Could not mark it read',
      description: error.detail ?? error.title,
    }),
  });
}

/** Marks every item read up to the newest one the panel showed, so one that arrives during the click stays unread. */
export function useMarkAllRead() {
  return useApiMutation({
    mutationFn: (upToId: number | undefined) => markAllInboxRead(upToId === undefined ? {} : { upToId }),
    invalidateKeys: [UNREAD_KEY, INBOX_KEY],
    errorNotification: (error) => ({
      message: 'Could not mark them read',
      description: error.detail ?? error.title,
    }),
  });
}
