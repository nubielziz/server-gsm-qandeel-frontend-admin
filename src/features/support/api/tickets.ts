// Support ticket routes (`/admin/support-tickets*`). Ports the data side of pageSupport / threadView (49-p-support.js) and the
// ticket mutations ticketReply / ticketSet of 12-state-b2c.js. The map gives no bodies (MISMATCHES M10), so every shape is an
// assumed contract.
import {
  apiGet,
  apiList,
  apiPatch,
  apiPost,
  pathOf,
  type ApiInit,
  type Id,
  type ListQuery,
  type ListResult,
} from '@/lib/api';
import type {
  NoteBody,
  ReplyBody,
  SupportTicket,
  SupportTicketDetail,
  TicketMessage,
  UpdateTicketBody,
} from '../types';

/**
 * The support inbox, one page of tickets, with the total in `x-total-count`. Filters: `status` (an array repeats the key),
 * `late`, `assigneeId`, `requesterType`, `requesterId` and `q` (ticket number, subject and requester name). The inbox sorts
 * late tickets first (`_sort=late,updatedAt`); the counts above it are this call with `_start=0&_end=1`.
 * Assumed contract: rows carry `requester`, `assignee` and the timers `lastPublicAt`, `slaDueAt` and `late`.
 * @route GET /admin/support-tickets
 */
export function listSupportTickets(
  query: ListQuery = {},
  init?: ApiInit,
): Promise<ListResult<SupportTicket>> {
  return apiList<SupportTicket>('/admin/support-tickets', query, undefined, init);
}

/**
 * One ticket with its whole thread, for the right-hand pane. A link can name any ticket, so the pane reads it by id and
 * does not depend on the list. The server answers 404 for an id that does not exist.
 * Assumed contract: the list row plus `messages` (oldest first) and `replyChannels`.
 * @route GET /admin/support-tickets/:id
 */
export function getSupportTicket(id: Id, init?: ApiInit): Promise<SupportTicketDetail> {
  return apiGet<SupportTicketDetail>(pathOf('/admin/support-tickets/:id', { id }), undefined, init);
}

/**
 * Changes a ticket's priority, assignee or status; only the fields that change are sent. `status: 'resolved'` resolves it
 * (the customer gets a short satisfaction survey), `status: 'open'` reopens it. The server writes the change to the audit log.
 * Assumed contract: body `{ priority?, assigneeId?, status? }`, answer the updated list row.
 * @route PATCH /admin/support-tickets/:id
 */
export function updateSupportTicket(id: Id, body: UpdateTicketBody, init?: ApiInit): Promise<SupportTicket> {
  return apiPatch<SupportTicket>(pathOf('/admin/support-tickets/:id', { id }), body, init);
}

/**
 * Answers the customer by email or Telegram. The reply is added to the thread, the ticket moves to "Waiting on customer" and
 * the first reply stamps the first-response time. The server answers 409 `TICKET_RESOLVED` for a resolved ticket.
 * Assumed contract: body `{ body, channel? }` (the channel only when the ticket allows more than one), answer the new message.
 * @route POST /admin/support-tickets/:id/reply
 */
export function replyToTicket(id: Id, body: ReplyBody, init?: ApiInit): Promise<TicketMessage> {
  return apiPost<TicketMessage>(pathOf('/admin/support-tickets/:id/reply', { id }), body, init);
}

/**
 * Adds an internal note: it is part of the thread for the team and the customer never sees it. It does not change the
 * ticket's status.
 * Assumed contract: body `{ body }`, answer the new message.
 * @route POST /admin/support-tickets/:id/note
 */
export function addTicketNote(id: Id, body: NoteBody, init?: ApiInit): Promise<TicketMessage> {
  return apiPost<TicketMessage>(pathOf('/admin/support-tickets/:id/note', { id }), body, init);
}
