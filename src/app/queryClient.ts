// Builds the app's QueryClient, shared by Refine's hooks and our own (useApiQuery / useApiMutation).
// Built here, not by Refine, so the auth queries can get their own refetch rules.
import { keepPreviousData, QueryClient } from '@tanstack/react-query';
import { shouldRetryApiQuery } from '@/lib/query';

/**
 * One client per app mount (tests mount many apps, and must not share cached answers). It keeps Refine's own defaults
 * (no refetch on window focus, keep the previous page while the next one loads) and adds our retry rules: a failed
 * read is retried only when it can still work (never a 4xx, once for a network failure or 5xx), and a mutation is
 * never retried, because repeating a request that may have moved money is the server's decision.
 */
export function createQueryClient(): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { refetchOnWindowFocus: false, placeholderData: keepPreviousData, retry: shouldRetryApiQuery },
      mutations: { retry: false },
    },
  });

  // Refine's "signed in?" answer only changes through sign-in and sign-out, which invalidate it. It must never refetch
  // on its own: <Authenticated> swaps the whole shell for its loading screen while the check is fetching, so a
  // reconnect refetch would throw away the open page, dialog or form. An expired session is still noticed: the next
  // API call answers 401 and the auth provider's onError signs out. Identity and permissions keep the normal rules,
  // so a failed first load of them recovers on reconnect without touching the shell.
  queryClient.setQueryDefaults(['auth', 'check'], {
    staleTime: Infinity,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
  return queryClient;
}
