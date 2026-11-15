// How a live event changes what the screens already hold: the cached thread (Refine's `useOne` answer) and the cached inbox pages (its `useList` answers).
// The functions are pure (they return the same object when nothing changed) and the `patch…` helpers apply them to every matching cache entry, so an event
// shows at once without a request. Messages are deduplicated and ordered by id; a seen mark only ever moves forward.
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { SupportTicket, SupportTicketDetail, TicketMessage } from '../types';
import { ticketDetailKey, TICKET_LISTS_KEY } from '../hooks/keys';
import { isRequesterMessage, type TicketRead } from './liveEvents';

/** What `useOne` caches: the thread inside `data`. */
export type DetailCache = { data: SupportTicketDetail };
/** What `useList` caches: one page of rows and the server's total. */
export type ListCache = { data: SupportTicket[]; total: number };

/** The highest id among the requester's messages, 0 when there is none: what "seen by the team" is measured against. */
export function newestRequesterMessageId(messages: readonly TicketMessage[]): number {
  let newest = 0;
  for (const message of messages) if (isRequesterMessage(message) && message.id > newest) newest = message.id;
  return newest;
}

/** Adds a message to the thread: nothing when its id is there already (a reply's own echo, a replay, a second tab), else in id order. */
export function appendMessage(
  cache: DetailCache | undefined,
  message: TicketMessage,
): DetailCache | undefined {
  if (!cache || cache.data.id !== message.ticketId) return cache;
  const { messages } = cache.data;
  if (messages.some((existing) => existing.id === message.id)) return cache;
  const at = messages.findIndex((existing) => existing.id > message.id);
  const next =
    at === -1 ? [...messages, message] : [...messages.slice(0, at), message, ...messages.slice(at)];
  return { ...cache, data: { ...cache.data, messages: next } };
}

/** The mark with the higher message id wins, with the time that goes with it, so a late or repeated event can never move a mark back. */
function newerMark(
  old: { id: number | null; at: string | null },
  incoming: { id: number | null; at: string | null },
): { id: number | null; at: string | null } {
  return (incoming.id ?? 0) > (old.id ?? 0) ? incoming : old;
}

/**
 * The row a `ticket.updated` brings, laid over the one we hold: everything the row carries replaces ours, except that a row older than ours (by
 * `updatedAt`) is ignored and the seen marks keep the higher of the two. Works on a list row and on a thread (its messages are not in the row).
 */
export function mergeRow<T extends SupportTicket>(old: T, row: SupportTicket): T {
  if (old.id !== row.id) return old;
  if (Date.parse(row.updatedAt) < Date.parse(old.updatedAt)) return old;
  const requester = newerMark(
    { id: old.requesterSeenMessageId, at: old.requesterSeenAt },
    { id: row.requesterSeenMessageId, at: row.requesterSeenAt },
  );
  const staff = newerMark(
    { id: old.staffSeenMessageId, at: old.staffSeenAt },
    { id: row.staffSeenMessageId, at: row.staffSeenAt },
  );
  return {
    ...old,
    ...row,
    requesterSeenMessageId: requester.id,
    requesterSeenAt: requester.at,
    staffSeenMessageId: staff.id,
    staffSeenAt: staff.at,
  };
}

/** A `ticket.read` laid over a ticket (a list row or a thread): one side's mark moves forward, or nothing changes. */
export function applyRead<T extends SupportTicket>(ticket: T, read: TicketRead): T {
  if (ticket.id !== read.ticketId) return ticket;
  if (read.by === 'requester') {
    if ((ticket.requesterSeenMessageId ?? 0) >= read.upToMessageId) return ticket;
    return { ...ticket, requesterSeenMessageId: read.upToMessageId, requesterSeenAt: read.at };
  }
  if ((ticket.staffSeenMessageId ?? 0) >= read.upToMessageId) return ticket;
  return { ...ticket, staffSeenMessageId: read.upToMessageId, staffSeenAt: read.at };
}

/** The same on a thread, which also knows its messages and so can say whether anything of the requester's is still unseen. */
function applyReadToDetail(cache: DetailCache | undefined, read: TicketRead): DetailCache | undefined {
  if (!cache) return cache;
  const next = applyRead(cache.data, read);
  if (next === cache.data) return cache;
  const hasUnread =
    read.by === 'staff'
      ? newestRequesterMessageId(next.messages) > (next.staffSeenMessageId ?? 0)
      : next.hasUnread;
  return { ...cache, data: { ...next, hasUnread } };
}

/** Runs `change` on every cached entry under `key`; true when at least one entry really changed (an entry that did not exist is not created). */
function patchAll<T>(
  queryClient: QueryClient,
  key: QueryKey,
  change: (old: T | undefined) => T | undefined,
): boolean {
  let changed = false;
  queryClient.setQueriesData<T>({ queryKey: key }, (old) => {
    const next = change(old);
    if (next !== old) changed = true;
    return next;
  });
  return changed;
}

/** Replaces the row in every cached inbox page that holds it. True when a page changed. */
export function patchListsWithRow(queryClient: QueryClient, row: SupportTicket): boolean {
  return patchAll<ListCache>(queryClient, TICKET_LISTS_KEY, (old) => {
    if (!old || !old.data.some((existing) => existing.id === row.id)) return old;
    let changed = false;
    const data = old.data.map((existing) => {
      const next = mergeRow(existing, row);
      if (next !== existing) changed = true;
      return next;
    });
    return changed ? { ...old, data } : old;
  });
}

/** Puts a `ticket.updated` row on the cached thread of that ticket (its messages stay). True when it changed. */
export function patchDetailWithRow(queryClient: QueryClient, row: SupportTicket): boolean {
  return patchAll<DetailCache>(queryClient, ticketDetailKey(row.id), (old) => {
    if (!old) return old;
    const next = mergeRow(old.data, row);
    return next === old.data ? old : { ...old, data: next };
  });
}

/** Appends a message to the cached thread of its ticket. True when the thread changed (false: not cached, or the message was there already). */
export function patchDetailWithMessage(queryClient: QueryClient, message: TicketMessage): boolean {
  return patchAll<DetailCache>(queryClient, ticketDetailKey(message.ticketId), (old) =>
    appendMessage(old, message),
  );
}

/** Moves one side's seen mark on the cached thread of that ticket. True when it changed. */
export function patchDetailWithRead(queryClient: QueryClient, read: TicketRead): boolean {
  return patchAll<DetailCache>(queryClient, ticketDetailKey(read.ticketId), (old) =>
    applyReadToDetail(old, read),
  );
}

/** Moves one side's seen mark on every cached inbox page that holds the ticket. True when a page changed. */
export function patchListsWithRead(queryClient: QueryClient, read: TicketRead): boolean {
  return patchAll<ListCache>(queryClient, TICKET_LISTS_KEY, (old) => {
    if (!old || !old.data.some((row) => row.id === read.ticketId)) return old;
    let changed = false;
    const data = old.data.map((row) => {
      const next = applyRead(row, read);
      if (next !== row) changed = true;
      return next;
    });
    return changed ? { ...old, data } : old;
  });
}

/** Clears the unread dot of a ticket on every cached inbox page: the thread on screen has just told the server the team saw its newest requester message. True when a page changed. */
export function patchListsAsSeen(queryClient: QueryClient, ticketId: number): boolean {
  return patchAll<ListCache>(queryClient, TICKET_LISTS_KEY, (old) => {
    if (!old || !old.data.some((row) => row.id === ticketId && row.hasUnread)) return old;
    return {
      ...old,
      data: old.data.map((row) => (row.id === ticketId ? { ...row, hasUnread: false } : row)),
    };
  });
}

/** The row of a ticket as the screens hold it now (an inbox page first, else the open thread), or undefined when no screen has loaded it. */
export function findCachedTicket(queryClient: QueryClient, ticketId: number): SupportTicket | undefined {
  for (const [, page] of queryClient.getQueriesData<ListCache>({ queryKey: TICKET_LISTS_KEY })) {
    const row = page?.data.find((candidate) => candidate.id === ticketId);
    if (row) return row;
  }
  for (const [, detail] of queryClient.getQueriesData<DetailCache>({ queryKey: ticketDetailKey(ticketId) })) {
    if (detail?.data.id === ticketId) return detail.data;
  }
  return undefined;
}
