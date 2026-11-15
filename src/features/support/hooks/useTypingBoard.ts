// Who is typing on which ticket, from the stream's `ticket.typing` events. The requester's typing shows as a line under the open thread and a pencil on the
// ticket's row; a colleague's typing shows in the thread's header (never one's own). Each line stays 6 seconds after the last event of that person and goes
// at once when that person's message arrives. Nothing is stored: typing is ephemeral and the server never replays it.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMe } from '@/features/auth';
import { TYPING_SHOW_MS } from '../lib/liveTiming';
import { isRequesterMessage, parseMessageCreated, parseTicketTyping, TICKET_EVENTS } from '../lib/liveEvents';
import type { TypingMode } from '../types';
import { useLiveEvent } from './useLiveEvent';

/** A colleague who is writing on a ticket, and what: a reply the customer will get or a note only the team sees. */
export interface StaffTyping {
  staffId: number;
  name: string;
  mode: TypingMode;
}

/** What the screens read: is the requester typing on this ticket, and which colleagues are writing on it. */
export interface TypingBoard {
  requesterTyping(ticketId: number): boolean;
  staffTyping(ticketId: number): readonly StaffTyping[];
}

type Entry = { ticketId: number; staff: StaffTyping | null };

const requesterKey = (ticketId: number) => `${ticketId}:requester`;
const staffKey = (ticketId: number, staffId: number) => `${ticketId}:staff:${staffId}`;

/** Keeps the board for the whole inbox page: one subscription, one timer per person who is typing. */
export function useTypingBoard(): TypingBoard {
  const { data: me } = useMe();
  const meId = me?.id;
  const [entries, setEntries] = useState<Readonly<Record<string, Entry>>>({});
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const forget = useCallback((key: string) => {
    clearTimeout(timers.current.get(key));
    timers.current.delete(key);
    setEntries((previous) => {
      if (!(key in previous)) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }, []);

  /** Shows (or keeps showing) one person's typing and restarts its 6 second clock. */
  const show = useCallback(
    (key: string, entry: Entry) => {
      clearTimeout(timers.current.get(key));
      timers.current.set(
        key,
        setTimeout(() => forget(key), TYPING_SHOW_MS),
      );
      setEntries((previous) => ({ ...previous, [key]: entry }));
    },
    [forget],
  );

  useLiveEvent(TICKET_EVENTS.typing, parseTicketTyping, (typing) => {
    if (typing.by === 'requester') {
      show(requesterKey(typing.ticketId), { ticketId: typing.ticketId, staff: null });
      return;
    }
    // Typing by a colleague: never for oneself (another tab of mine rings too), and only when the server says who and what.
    if (typing.staffId === null || typing.staffId === meId || typing.mode === null) return;
    show(staffKey(typing.ticketId, typing.staffId), {
      ticketId: typing.ticketId,
      staff: { staffId: typing.staffId, name: typing.staffName ?? 'A colleague', mode: typing.mode },
    });
  });

  // A message from the person who was typing ends that line at once (a note counts: that colleague is done writing).
  useLiveEvent(TICKET_EVENTS.messageCreated, parseMessageCreated, ({ message }) => {
    if (isRequesterMessage(message)) forget(requesterKey(message.ticketId));
    else if (message.authorType === 'staff' && message.authorId !== null)
      forget(staffKey(message.ticketId, message.authorId));
  });

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  return useMemo<TypingBoard>(
    () => ({
      requesterTyping: (ticketId) => requesterKey(ticketId) in entries,
      staffTyping: (ticketId) =>
        Object.values(entries).flatMap((entry) =>
          entry.ticketId === ticketId && entry.staff !== null ? [entry.staff] : [],
        ),
    }),
    [entries],
  );
}
