// The bell's number: how many notifications the staff member has not read. It follows the live stream (`unread.changed`, `notification.created`,
// `notification.read` set the number at once, and a new item shows a toast). Without the stream it asks every 60 seconds while the tab is visible; with
// it open it asks every 5 minutes as a safety net. It also asks when the window is focused again and after a read action (the actions invalidate
// `UNREAD_KEY`). It never asks before `me` is known: without a session it would be a 401.
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from '@/components/ui';
import { useMe } from '@/features/auth';
import { useApiQuery } from '@/lib/query';
import { useStreamEvent, useStreamOpen, useStreamRefetch } from '@/lib/realtime';
import { getUnreadCount } from '../api';
import { toastBody } from '../lib/inbox';
import type { InboxItem, UnreadCount } from '../types';
import { INBOX_KEY, LIVE_UNREAD_REFRESH_MS, UNREAD_KEY, UNREAD_REFRESH_MS } from './keys';

export function useUnreadCount() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const live = useStreamOpen();
  // Switching back to the window (not only to the tab, which React Query already notices) asks again.
  const signedIn = me !== undefined;
  useEffect(() => {
    if (!signedIn) return;
    const onFocus = () => {
      if (document.visibilityState === 'visible')
        void queryClient.invalidateQueries({ queryKey: UNREAD_KEY });
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [signedIn, queryClient]);

  // The stream's number is the server's own (capped at 100), so it goes straight into the cache; the list is refetched if it is open.
  const setUnread = (unread: number) => queryClient.setQueryData<UnreadCount>(UNREAD_KEY, { unread });
  const refreshList = () => void queryClient.invalidateQueries({ queryKey: INBOX_KEY });
  useStreamEvent('unread.changed', ({ unread }) => {
    setUnread(unread);
    refreshList();
  });
  useStreamEvent('notification.read', ({ unread }) => {
    setUnread(unread);
    refreshList();
  });
  useStreamEvent('notification.created', ({ item, unread, live: isLive }) => {
    setUnread(unread);
    refreshList();
    // Only an item that arrived now (not one the server replayed after a reconnect), and only in a tab someone is looking at.
    if (isLive && document.visibilityState === 'visible') showToast(item);
  });
  // A resync, or the stream coming back: the server cannot say what was missed.
  useStreamRefetch(() => {
    void queryClient.invalidateQueries({ queryKey: UNREAD_KEY });
    refreshList();
  });

  const query = useApiQuery({
    queryKey: UNREAD_KEY,
    queryFn: ({ signal }) => getUnreadCount({ signal }),
    enabled: me !== undefined,
    // The answer is personal and changes whenever something arrives: it is never reused from the cache.
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: () =>
      document.visibilityState === 'visible' ? (live ? LIVE_UNREAD_REFRESH_MS : UNREAD_REFRESH_MS) : false,
    select: (data) => data.unread,
  });
  return { unread: query.data, query };
}

/** The toast of a live notification: its title and the start of its text, as plain text. One id per item, so the same item never stacks twice. */
function showToast(item: Pick<InboxItem, 'id' | 'title' | 'body'>) {
  toast({ id: `notification-${item.id}`, kind: 'info', title: item.title, body: toastBody(item.body) });
}
