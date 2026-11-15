// The inbox, live (backend feature 28, plan §4.1): a `ticket.updated` replaces the ticket's row in every cached page and, at most once every 5 seconds, asks the
// server for the pages (order and membership are the server's), the four figures and the dashboard (the sidebar's ticket count). A `ticket.read` by the team moves
// the row's seen mark and asks for the pages once (the server says whether anything is still unread); a `resync` or a stream that came back does the full refresh.
// Mounted once on the Support page, so the inbox follows the stream even when no thread is open. The open thread is `useTicketLive`'s job.
import { useQueryClient } from '@tanstack/react-query';
import { useStreamRefetch } from '@/lib/realtime';
import { INVALIDATE_MS } from '../lib/liveTiming';
import { parseTicketRead, parseTicketUpdated, TICKET_EVENTS } from '../lib/liveEvents';
import { patchListsWithRead, patchListsWithRow } from '../lib/liveCache';
import { TICKET_LISTS_KEY, TICKET_STALE_KEYS } from './keys';
import { useLiveEvent } from './useLiveEvent';
import { useThrottle } from './useThrottle';

export function useInboxLive(): void {
  const queryClient = useQueryClient();

  const refreshEverything = useThrottle(() => {
    void queryClient.invalidateQueries({ queryKey: TICKET_LISTS_KEY });
    for (const queryKey of TICKET_STALE_KEYS) void queryClient.invalidateQueries({ queryKey });
  }, INVALIDATE_MS);
  const refreshPages = useThrottle(() => {
    void queryClient.invalidateQueries({ queryKey: TICKET_LISTS_KEY });
  }, INVALIDATE_MS);

  useLiveEvent(TICKET_EVENTS.updated, parseTicketUpdated, ({ ticket }) => {
    patchListsWithRow(queryClient, ticket);
    refreshEverything.call();
  });

  useLiveEvent(TICKET_EVENTS.read, parseTicketRead, (read) => {
    // The requester's mark only changes the "Seen" line of the thread. The team's mark can clear a row's unread dot, and only the server knows whether a newer
    // requester message is still unread: the mark moves at once, the pages are read once (a repeat of one's own mark costs nothing more than that read).
    patchListsWithRead(queryClient, read);
    if (read.by === 'staff') refreshPages.call();
  });

  useStreamRefetch(() => refreshEverything.call());
}
