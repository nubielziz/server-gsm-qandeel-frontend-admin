// The actions on a ticket, each with the toast the demo showed and the reads it makes stale. The composer shows a failed reply
// or note itself (under the text), so those two toast no error; priority, assignee and status have no spot of their own, so
// the default error toast shows the server's message.
import { useApiMutation, type InvalidateTarget } from '@/lib/query';
import { addTicketNote, replyToTicket, updateSupportTicket } from '../api';
import type { ReplyChannel, UpdateTicketBody } from '../types';
import { TICKET_STALE_KEYS } from './keys';

const NO_ERROR_TOAST = () => false as const;

// A change to one ticket refreshes the lists and that ticket's thread.
const staleTicket = (id: number): InvalidateTarget[] => [{ resource: 'support-tickets', id }];

/** Sends a reply to the customer. The server moves a new or open ticket to "Waiting on customer". */
export function useReplyToTicket() {
  return useApiMutation({
    mutationFn: ({
      ticketId,
      body,
      channel,
      fileIds,
    }: {
      ticketId: number;
      body: string;
      channel?: ReplyChannel;
      /** Files uploaded with `uploadTicketFile` (feature 28); the key is left out when there are none. */
      fileIds?: readonly number[];
    }) =>
      replyToTicket(ticketId, {
        body,
        ...(channel ? { channel } : {}),
        ...(fileIds && fileIds.length > 0 ? { fileIds: [...fileIds] } : {}),
      }),
    invalidates: (_message, { ticketId }) => staleTicket(ticketId),
    invalidateKeys: TICKET_STALE_KEYS,
    successNotification: () => ({ message: 'Reply sent', description: 'Status is now Waiting on customer.' }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Adds an internal note; the customer never sees it and the status stays. */
export function useAddTicketNote() {
  return useApiMutation({
    mutationFn: ({
      ticketId,
      body,
      fileIds,
    }: {
      ticketId: number;
      body: string;
      fileIds?: readonly number[];
    }) =>
      addTicketNote(ticketId, { body, ...(fileIds && fileIds.length > 0 ? { fileIds: [...fileIds] } : {}) }),
    invalidates: (_message, { ticketId }) => staleTicket(ticketId),
    invalidateKeys: TICKET_STALE_KEYS,
    successNotification: () => ({ message: 'Note added', description: 'Only your team sees it.' }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Changes priority, assignee or status (Resolve and Reopen). Only resolving toasts, as in the demo. */
export function useUpdateTicket() {
  return useApiMutation({
    mutationFn: ({ ticketId, body }: { ticketId: number; body: UpdateTicketBody }) =>
      updateSupportTicket(ticketId, body),
    invalidates: (_ticket, { ticketId }) => staleTicket(ticketId),
    invalidateKeys: TICKET_STALE_KEYS,
    successNotification: (_ticket, { body }) =>
      body.status === 'resolved'
        ? { message: 'Ticket resolved', description: 'The customer gets a short satisfaction survey.' }
        : false,
  });
}
