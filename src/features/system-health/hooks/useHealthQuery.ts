// The one way every System health read is made: `useApiQuery` with polling, and the previous answer kept while a new
// key (another range, filter or page) loads, so a card never flashes back to its skeleton.
import { keepPreviousData } from '@tanstack/react-query';
import type { ApiInit } from '@/lib/api';
import { useApiQuery, type ApiQueryKey } from '@/lib/query';

type HealthQueryOptions<T> = {
  key: ApiQueryKey;
  /** Calls the API function; `init` carries the abort signal, so a leaving page cancels the request. */
  read: (init: ApiInit) => Promise<T>;
  /** Milliseconds between reads, or a function of the last answer (the integrity check polls faster while it runs). */
  poll: number | ((data: T | undefined) => number);
  enabled: boolean;
  /**
   * Whether the previous answer may stay on screen while this key loads; it is given the previous key. The default is
   * yes, which suits a new range, filter or page of the same view. A read that switches to another record, queue or
   * component says no, so a card never shows one record's data under another record's name.
   */
  keepPrevious?: (previousKey: readonly unknown[]) => boolean;
};

/**
 * A read this young is reused instead of sent again, so the shell banner and the page share one health read on load.
 * Well under the fastest poll (15 s), so it never delays a refresh.
 */
const FRESH_FOR_MS = 5_000;

/**
 * Wraps `useApiQuery` for the health reads. It does not set `refetchIntervalInBackground`: React Query then pauses the
 * polling while the browser tab is hidden, which is what we want for a monitoring screen nobody is looking at. When the
 * tab comes back it reads at once (`refetchOnWindowFocus`, off app-wide) instead of showing old data until the next
 * poll.
 */
export function useHealthQuery<T>({ key, read, poll, enabled, keepPrevious }: HealthQueryOptions<T>) {
  return useApiQuery<T>({
    queryKey: key,
    queryFn: ({ signal }) => read({ signal }),
    placeholderData: keepPrevious
      ? (previous, previousQuery) =>
          previousQuery && keepPrevious(previousQuery.queryKey) ? previous : undefined
      : keepPreviousData,
    refetchInterval: typeof poll === 'function' ? (query) => poll(query.state.data) : poll,
    refetchOnWindowFocus: true,
    staleTime: FRESH_FOR_MS,
    enabled,
  });
}
