// The open thread, live (backend feature 28, plan §4.1). A `ticket.message.created` for this ticket is added to the cached thread (no request of its own; one
// message once however often it arrives, in id order); a `ticket.updated` for it replaces the ticket's row in the thread; either one, arriving while a read of
// the thread is still on its way, also reads it again once (the older answer must not undo it); a `ticket.read` moves the seen mark under the last reply; a
// `resync` or a stream that came back reads the thread again (at most once in 5 seconds). It also keeps the collision warning: for 30 seconds after a
// colleague's public reply arrives, the composer says so. The inbox list and the counts are `useInboxLive`'s job, not this hook's.
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useStreamRefetch } from '@/lib/realtime';
import { useMe } from '@/features/auth';
import { INVALIDATE_MS, COLLISION_MS } from '../lib/liveTiming';
import { parseMessageCreated, parseTicketRead, parseTicketUpdated, TICKET_EVENTS } from '../lib/liveEvents';
import { patchDetailWithMessage, patchDetailWithRead, patchDetailWithRow } from '../lib/liveCache';
import { ticketDetailKey } from './keys';
import { useLiveEvent } from './useLiveEvent';
import { useThrottle } from './useThrottle';

/** A colleague answered this ticket a moment ago: whoever is writing should read the thread before sending. */
export interface Collision {
  ticketId: number;
  /** The colleague who just replied. */
  name: string;
}

/** Follows ticket `id` on the stream. Answers the collision warning, or null when there is none. */
export function useTicketLive(id: number): { collision: Collision | null } {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const meId = me?.id;
  const [collision, setCollision] = useState<Collision | null>(null);
  const collisionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // The warning belongs to this ticket's page: it goes with it, and its clock stops.
  useEffect(() => () => clearTimeout(collisionTimer.current), [id]);

  const readAgain = useThrottle(() => {
    const queryKey = ticketDetailKey(id);
    // A thread that has no answer yet (its first read) is not replaced by an invalidation: TanStack Query hands the read in flight back instead, and its
    // older answer would stand. Cancel that read first (a no-op when none is running) so the invalidation starts a new one.
    void queryClient.cancelQueries({ queryKey }).then(() => queryClient.invalidateQueries({ queryKey }));
  }, INVALIDATE_MS);

  /** True while the thread of this ticket is being read from the server. */
  const isReadingThread = () => queryClient.isFetching({ queryKey: ticketDetailKey(id) }) > 0;

  useLiveEvent(TICKET_EVENTS.messageCreated, parseMessageCreated, ({ ticketId, message, live }) => {
    if (ticketId !== id) return;
    patchDetailWithMessage(queryClient, message);
    // A read of the thread that started before this message may still be on its way with the older answer, which would drop it (the first read of a
    // ticket has nothing cached to patch, so it counts too): read again once the burst settles. Without such a read in flight the event needs no request.
    if (isReadingThread()) readAgain.call();

    // Rule 4: a colleague's public reply (one that is happening now, not a replay) starts the warning; one's own reply settles it.
    if (!live || message.authorType !== 'staff' || message.isInternal) return;
    clearTimeout(collisionTimer.current);
    if (message.authorId === meId) {
      setCollision(null);
      return;
    }
    setCollision({ ticketId: id, name: message.authorName });
    collisionTimer.current = setTimeout(() => setCollision(null), COLLISION_MS);
  });

  useLiveEvent(TICKET_EVENTS.updated, parseTicketUpdated, ({ ticket }) => {
    if (ticket.id !== id) return;
    patchDetailWithRow(queryClient, ticket);
    // The same gap: a read already in flight would overwrite this change with its older answer.
    if (isReadingThread()) readAgain.call();
  });

  useLiveEvent(TICKET_EVENTS.read, parseTicketRead, (read) => {
    if (read.ticketId === id) patchDetailWithRead(queryClient, read);
  });

  useStreamRefetch(() => readAgain.call());

  return { collision: collision?.ticketId === id ? collision : null };
}
