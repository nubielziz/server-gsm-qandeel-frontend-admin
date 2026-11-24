// Plain ticket and message values for the unit tests of the live code (no app, no mock API). Import them from tests only.
import type { SupportTicket, SupportTicketDetail, TicketMessage } from '../types';

/** A message of the staff view; a requester's (customer) unless `change` says otherwise. */
export function message(id: number, change: Partial<TicketMessage> = {}): TicketMessage {
  return {
    id,
    ticketId: 10,
    authorType: 'customer',
    authorId: 28,
    authorName: 'Victor Silva',
    body: `Message ${id}`,
    isInternal: false,
    fileIds: [],
    attachments: [],
    createdAt: '2026-11-15T10:00:00.000Z',
    ...change,
  };
}

/** A public reply of a staff member. */
export const reply = (id: number, change: Partial<TicketMessage> = {}) =>
  message(id, { authorType: 'staff', authorId: 2, authorName: 'Lina S.', ...change });

/** A list row, with nothing seen yet. */
export function row(change: Partial<SupportTicket> = {}): SupportTicket {
  return {
    id: 10,
    number: 'T-10',
    subject: 'Phone still locked',
    channel: 'web',
    requesterType: 'customer',
    requesterId: 28,
    requester: { name: 'Victor Silva', email: null },
    orderId: null,
    category: 'failed_unlock',
    priority: 'normal',
    status: 'open',
    assigneeId: null,
    assignee: null,
    slaDueAt: null,
    firstResponseAt: null,
    resolvedAt: null,
    createdAt: '2026-11-15T09:00:00.000Z',
    updatedAt: '2026-11-15T10:00:00.000Z',
    lastPublicAt: null,
    late: false,
    hasUnread: true,
    requesterSeenMessageId: null,
    requesterSeenAt: null,
    staffSeenMessageId: null,
    staffSeenAt: null,
    ...change,
  };
}

/** A thread: the row and these messages. */
export function detail(messages: TicketMessage[], change: Partial<SupportTicket> = {}): SupportTicketDetail {
  return { ...row(change), messages, replyChannels: ['email'] };
}
