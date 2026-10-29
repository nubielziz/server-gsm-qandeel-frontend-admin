// API health for the sidebar footer, polled once a minute (only while the tab is visible).
import { useApiQuery } from '@/lib/query';
import { getHealth } from '../api';

export const HEALTH_POLL_MS = 60_000;

/** `data` is the health body; an `error` means the API did not answer with a 2xx. */
export function useHealth() {
  return useApiQuery({
    queryKey: ['api', 'system', 'health'],
    queryFn: ({ signal }) => getHealth({ signal }),
    refetchInterval: HEALTH_POLL_MS,
    // The next poll is a minute away; showing "unreachable" quickly beats retrying.
    retry: false,
  });
}
