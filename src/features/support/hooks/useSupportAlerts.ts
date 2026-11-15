// The console's alerts for the support inbox (feature 28, plan §2 rule 5). When a customer or a merchant writes, or a ticket is opened, and the ticket is
// assigned to me or to nobody: a short sound (Web Audio, after the first click or key press on the page) and, when the tab is hidden and the staff member
// allowed it, a desktop notification "New message on T-1042" with the requester's name and no text. It runs on every page (the manifest's top bar slot)
// and only in the tab that holds the stream: a tab that gets the event relayed from another tab stays quiet, so one message is one alert for the browser.
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { usePreferences } from '@/app/layout/preferences';
import { useMe } from '@/features/auth';
import { createAlertSound } from '../lib/alertSound';
import { alertText, isFreshTicket, PENDING_ROW_MS, REMEMBERED_ALERTS, wantsAlert } from '../lib/alerts';
import { showDesktopAlert } from '../lib/desktopAlert';
import { supportTicketPath } from '../lib/filters';
import { findCachedTicket } from '../lib/liveCache';
import {
  isRequesterMessage,
  parseMessageCreated,
  parseTicketUpdated,
  TICKET_EVENTS,
} from '../lib/liveEvents';
import type { SupportTicket } from '../types';
import { useLiveEvent } from './useLiveEvent';

/** Remembers the last `limit` keys: a key already there is "seen", a new one is added (the oldest goes when the list is full). */
function rememberOnce(seen: Set<number>, key: number, limit: number): boolean {
  if (seen.has(key)) return false;
  seen.add(key);
  if (seen.size > limit) seen.delete(seen.values().next().value as number);
  return true;
}

export function useSupportAlerts(): void {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const { supportSound, desktopAlerts } = usePreferences();
  const [sound] = useState(createAlertSound);
  /** Tickets whose requester wrote and whose `ticket.updated` (the assignee, the number) has not come yet, each with a timer that alerts anyway. */
  const waiting = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const alertedMessages = useRef(new Set<number>());
  const alertedTickets = useRef(new Set<number>());

  // Browsers allow sound only after the user has used the page: start listening for that first gesture.
  useEffect(() => sound.arm(), [sound]);
  useEffect(() => {
    const pending = waiting.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  /** The alert itself. `row` is the ticket when it is known, else the screens' own copy of it, else nothing (generic words). */
  function alertFor(ticketId: number, known: SupportTicket | null) {
    const row = known ?? findCachedTicket(queryClient, ticketId) ?? null;
    if (!wantsAlert(row, me?.id)) return;
    if (supportSound) sound.play();
    if (desktopAlerts && document.visibilityState === 'hidden') {
      const { title, body } = alertText(row);
      showDesktopAlert({
        title,
        body,
        tag: `support-ticket-${ticketId}`,
        onOpen: () => void navigate(supportTicketPath(ticketId)),
      });
    }
  }

  // The timer of a waiting alert runs a moment later: it must use the preferences of that moment, not of the render that started it.
  const latestAlert = useRef(alertFor);
  useEffect(() => {
    latestAlert.current = alertFor;
  });

  useLiveEvent(TICKET_EVENTS.messageCreated, parseMessageCreated, ({ ticketId, message, live }, meta) => {
    // A replay after a reconnect is old news, a colleague's message or a note is not a customer, and a relayed event is another tab's to alert for.
    if (meta.relayed || !live || message.isInternal || !isRequesterMessage(message)) return;
    if (!rememberOnce(alertedMessages.current, message.id, REMEMBERED_ALERTS)) return;
    // The `ticket.updated` that follows names the assignee and the number: wait for it, but not forever.
    clearTimeout(waiting.current.get(ticketId));
    waiting.current.set(
      ticketId,
      setTimeout(() => {
        waiting.current.delete(ticketId);
        latestAlert.current(ticketId, null);
      }, PENDING_ROW_MS),
    );
  });

  useLiveEvent(TICKET_EVENTS.updated, parseTicketUpdated, ({ ticket }, meta) => {
    if (meta.relayed) return;
    const timer = waiting.current.get(ticket.id);
    if (timer !== undefined) {
      clearTimeout(timer);
      waiting.current.delete(ticket.id);
      rememberOnce(alertedTickets.current, ticket.id, REMEMBERED_ALERTS);
      alertFor(ticket.id, ticket);
      return;
    }
    // A ticket that has just been opened with no message event of its own: the row alone is the news (once per ticket).
    if (
      isFreshTicket(ticket, Date.now()) &&
      rememberOnce(alertedTickets.current, ticket.id, REMEMBERED_ALERTS)
    ) {
      alertFor(ticket.id, ticket);
    }
  });
}
