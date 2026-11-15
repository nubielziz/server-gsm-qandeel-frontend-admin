// How often the inbox, the open thread and the counts ask again on their own: every 30 seconds while the live stream is closed (customers write by
// themselves), every 5 minutes while it is open (a safety net for an event that never came).
import { useStreamOpen } from '@/lib/realtime';
import { LIVE_REFRESH_MS, REFRESH_MS } from './keys';

export function useRefreshInterval(): number {
  return useStreamOpen() ? LIVE_REFRESH_MS : REFRESH_MS;
}
