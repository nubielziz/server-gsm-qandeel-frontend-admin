// The bell's number: how many notifications the staff member has not read. It asks every 60 seconds while the tab is visible, when the window is
// focused again, and after a read action (the actions invalidate `UNREAD_KEY`). It never asks before `me` is known: without a session it would be a 401.
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useMe } from '@/features/auth';
import { useApiQuery } from '@/lib/query';
import { getUnreadCount } from '../api';
import { UNREAD_KEY, UNREAD_REFRESH_MS } from './keys';

export function useUnreadCount() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
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
  const query = useApiQuery({
    queryKey: UNREAD_KEY,
    queryFn: ({ signal }) => getUnreadCount({ signal }),
    enabled: me !== undefined,
    // The answer is personal and changes whenever something arrives: it is never reused from the cache.
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: () => (document.visibilityState === 'visible' ? UNREAD_REFRESH_MS : false),
    select: (data) => data.unread,
  });
  return { unread: query.data, query };
}
