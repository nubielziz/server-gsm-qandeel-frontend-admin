// Tells the server the team has seen the requester's messages (feature 28, rule 3). The thread calls `markTicketRead` for the newest one only when all of this holds: the
// thread is on screen, the tab is visible and focused, and the newest requester message is newer than the mark the ticket already has. Each message is marked once:
// the highest id sent is remembered, so a re-render, a refetch or a second event never repeats the call. A failed call is forgotten so a later change can try again,
// and is never shown (a missed mark only means "Sent" stays a little longer for the customer).
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { markTicketRead } from '../api';
import {
  newestRequesterMessageId,
  patchDetailWithRead,
  patchListsAsSeen,
  patchListsWithRead,
} from '../lib/liveCache';
import type { TicketRead } from '../lib/liveEvents';
import type { SupportTicketDetail } from '../types';
import { useAttention } from './useAttention';

/**
 * `id` is the thread's ticket; `ticket` is its loaded thread (a thread of another ticket, for example kept from before, is ignored). `shown` is false while the
 * thread is hidden (a phone showing the list).
 */
export function useMarkRead(id: number, ticket: SupportTicketDetail | undefined, shown: boolean): void {
  const queryClient = useQueryClient();
  const attended = useAttention();
  /** The highest message id already sent for each ticket this page has shown. */
  const sent = useRef(new Map<number, number>());

  const own = ticket?.id === id ? ticket : undefined;
  const newest = own ? newestRequesterMessageId(own.messages) : 0;
  const seen = own?.staffSeenMessageId ?? 0;

  useEffect(() => {
    if (!own || !shown || !attended) return;
    if (newest <= seen || newest <= (sent.current.get(id) ?? 0)) return;
    sent.current.set(id, newest);
    const upToMessageId = newest;
    markTicketRead(id, { upToMessageId }).then(
      () => {
        // The server moved the mark: show it on the thread and the row now, with no refetch.
        const read: TicketRead = { ticketId: id, by: 'staff', upToMessageId, at: new Date().toISOString() };
        patchDetailWithRead(queryClient, read);
        patchListsWithRead(queryClient, read);
        patchListsAsSeen(queryClient, id);
      },
      () => {
        if (sent.current.get(id) === upToMessageId) sent.current.delete(id);
      },
    );
  }, [id, own, shown, attended, newest, seen, queryClient]);
}
