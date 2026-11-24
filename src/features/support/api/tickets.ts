// Support ticket routes (`/admin/support-tickets*`). Ports the data side of pageSupport / threadView (49-p-support.js) and the
// ticket mutations ticketReply / ticketSet of 12-state-b2c.js. The map gives no bodies (MISMATCHES M10), so every shape is an
// assumed contract.
import {
  apiGet,
  apiList,
  apiPatch,
  apiPost,
  apiUrl,
  pathOf,
  type ApiInit,
  type Id,
  type ListQuery,
  type ListResult,
} from '@/lib/api';
import type {
  MarkReadBody,
  NoteBody,
  ReplyBody,
  StoredTicketFile,
  SupportTicket,
  SupportTicketDetail,
  TicketFileUpload,
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
 * and `status: 'open'` reopens it. The server writes the change to the audit log.
 * Assumed contract: body `{ priority?, assigneeId?, status? }`, answer the updated list row.
 * @route PATCH /admin/support-tickets/:id
 */
export function updateSupportTicket(id: Id, body: UpdateTicketBody, init?: ApiInit): Promise<SupportTicket> {
  return apiPatch<SupportTicket>(pathOf('/admin/support-tickets/:id', { id }), body, init);
}

/**
 * Answers the customer by email or Telegram. The reply is added to the thread, the ticket moves to "Waiting on customer" and
 * the first reply stamps the first-response time. The server answers 409 `TICKET_RESOLVED` for a resolved ticket.
 * Assumed contract: body `{ body, channel?, fileIds? }` (the channel only when the ticket allows more than one; `fileIds`
 * are files uploaded with `uploadTicketFile`, at most 5, and the text may be empty when there is one), answer the new message.
 * @route POST /admin/support-tickets/:id/reply
 */
export function replyToTicket(id: Id, body: ReplyBody, init?: ApiInit): Promise<TicketMessage> {
  return apiPost<TicketMessage>(pathOf('/admin/support-tickets/:id/reply', { id }), body, init);
}

/**
 * Adds an internal note: it is part of the thread for the team and the customer never sees it. It does not change the
 * ticket's status.
 * Assumed contract: body `{ body, fileIds? }` (the text may be empty when there is a file), answer the new message.
 * @route POST /admin/support-tickets/:id/note
 */
export function addTicketNote(id: Id, body: NoteBody, init?: ApiInit): Promise<TicketMessage> {
  return apiPost<TicketMessage>(pathOf('/admin/support-tickets/:id/note', { id }), body, init);
}

/**
 * Tells the server the team has seen the requester's messages up to `body.upToMessageId` (the newest one on screen). It moves one
 * mark on the ticket, only forward: a repeat is a plain 204 and rings nothing. The customer learns that support saw their
 * message, never who. Backend addition, B218 (feature 28). The server answers 422 `upToMessageId` (`unknown_message`) for an id
 * that is not a message of this ticket. Needs `support:read`; it writes no audit entry.
 * @route POST /admin/support-tickets/:id/read
 */
export function markTicketRead(id: Id, body: MarkReadBody, init?: ApiInit): Promise<void> {
  return apiPost<void>(pathOf('/admin/support-tickets/:id/read', { id }), body, init);
}

/**
 * Uploads one attachment for a reply or note of this ticket: `body.file` goes as `multipart/form-data` with one part `file` (PDF,
 * JPEG or PNG, 1 byte to 5 MiB, checked by its content). The answer's `id` goes into `fileIds` of the message. Backend addition, B218 (feature 28).
 * The server answers 422 on `file` (`type`, `empty`), 413 over 5 MiB, 429 `RATE_LIMITED`. Needs `support:reply`; audited
 * as `attached file to ticket`.
 * @route POST /admin/support-tickets/:id/files
 */
export function uploadTicketFile(id: Id, body: TicketFileUpload, init?: ApiInit): Promise<StoredTicketFile> {
  // The body is typed as its parts (the contract compares `file` with the route's binary part); the wire form is multipart.
  const form = new FormData();
  form.append('file', body.file);
  return apiPost<StoredTicketFile>(pathOf('/admin/support-tickets/:id/files', { id }), form, init);
}

/**
 * The link that downloads an attachment of this ticket (every file of the ticket, notes included). The server answers a redirect
 * to a presigned link that lives 5 minutes, with `Content-Disposition: attachment`, so the console builds a plain link and makes no
 * request itself. Backend addition, B218 (feature 28). Needs `support:read`.
 * @route GET /admin/support-tickets/:id/files/:fileId
 */
export function ticketFileUrl(id: Id, fileId: Id): string {
  return apiUrl(pathOf('/admin/support-tickets/:id/files/:fileId', { id, fileId }));
}
