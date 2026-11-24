// What the mock ticket routes tell the dev stream, the way the real API rings its doorbell (backend feature 28, plan §3.4): a new message, the ticket's row
// and a seen mark. The staff view only (notes and system messages included): the console never listens to the requester's view. Dev and tests only.
import { pushMockStreamEvent } from '@/mocks/stream';
import type { TicketMessage } from '../types';
import { toTicket } from './dto';
import type { MockTicket } from './types';

/** `ticket.message.created`, with the stream id `t<message id>`. `live` is false only for a replay. */
export function pushMessage(message: TicketMessage): void {
  pushMockStreamEvent(
    'ticket.message.created',
    { ticketId: message.ticketId, message, live: true },
    `t${message.id}`,
  );
}

/** `ticket.updated`: the ticket's whole list row, as it is now. */
export function pushTicket(ticket: MockTicket): void {
  pushMockStreamEvent('ticket.updated', { ticket: toTicket(ticket) });
}

/** A new message and the row that follows it, in the order the real stream sends them. */
export function pushMessageAndTicket(ticket: MockTicket, message: TicketMessage): void {
  pushMessage(message);
  pushTicket(ticket);
}

/** `ticket.read`: one side's seen mark moved to `upToMessageId`. */
export function pushRead(
  ticket: MockTicket,
  by: 'requester' | 'staff',
  upToMessageId: number,
  at: string,
): void {
  pushMockStreamEvent('ticket.read', { ticketId: ticket.id, by, upToMessageId, at });
}
