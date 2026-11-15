// The support chat's live events on the staff stream (`GET /admin/stream`, backend feature 28, plan §3.4) and the parsers that check them. The layer's own
// `useStreamEvent` hands any event it does not know over as `unknown`, so this file turns each frame into a typed value or skips it (null), never half-used.
import type { Id, IsoDateTime } from '@/lib/api';
import type {
  Attachment,
  MessageAuthorType,
  RequesterType,
  SupportTicket,
  TicketCategory,
  TicketChannel,
  TicketMessage,
  TicketPriority,
  TicketStatus,
  TypingMode,
} from '../types';

/** The names of the four ticket events (staff view: notes and system messages included). */
export const TICKET_EVENTS = {
  messageCreated: 'ticket.message.created',
  updated: 'ticket.updated',
  read: 'ticket.read',
  typing: 'ticket.typing',
} as const;

/** A message was written on a ticket. `live` is false for one the server replayed after a reconnect. The stream's event id is `t<message id>`. */
export interface TicketMessageCreated {
  ticketId: Id;
  message: TicketMessage;
  live: boolean;
}

/** A ticket changed (status, assignee, priority, rating, a new ticket, a new message): its whole list row. */
export interface TicketUpdated {
  ticket: SupportTicket;
}

/** One side marked the other's messages seen up to `upToMessageId`. */
export interface TicketRead {
  ticketId: Id;
  by: 'requester' | 'staff';
  upToMessageId: Id;
  at: IsoDateTime;
}

/** Someone is typing on a ticket: the requester, or a staff member (`staffId` and `staffName` say who; `mode` says reply or note). */
export interface TicketTyping {
  ticketId: Id;
  by: 'requester' | 'staff';
  staffId: Id | null;
  staffName: string | null;
  mode: TypingMode | null;
}

type Obj = Record<string, unknown>;
const isObject = (value: unknown): value is Obj =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;
const isText = (value: unknown): value is string => typeof value === 'string';
const isNullable = (value: unknown, check: (v: unknown) => boolean): boolean =>
  value === null || check(value);
const oneOf = <T extends string>(value: unknown, words: readonly T[]): value is T =>
  isText(value) && (words as readonly string[]).includes(value);

const AUTHORS: readonly MessageAuthorType[] = ['customer', 'client', 'staff', 'system'];
const STATUSES: readonly TicketStatus[] = ['new', 'open', 'pending', 'resolved'];
const PRIORITIES: readonly TicketPriority[] = ['high', 'normal', 'low'];
const REQUESTERS: readonly RequesterType[] = ['customer', 'client'];
const CHANNELS: readonly TicketChannel[] = ['email', 'web', 'chat', 'telegram'];
const CATEGORIES: readonly TicketCategory[] = [
  'delay',
  'failed_unlock',
  'refund',
  'billing',
  'wrong_imei',
  'howto',
  'presale',
  'other',
];

function parseAttachments(value: unknown): Attachment[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const list: Attachment[] = [];
  for (const item of value) {
    if (!isObject(item) || !isId(item.id) || !isText(item.filename) || !isText(item.mime)) return null;
    if (typeof item.size !== 'number') return null;
    list.push({ id: item.id, filename: item.filename, mime: item.mime, size: item.size });
  }
  return list;
}

/** One message of the staff view. A missing `attachments` or `fileIds` is read as none (the server always sends them). */
export function parseMessage(value: unknown): TicketMessage | null {
  if (!isObject(value)) return null;
  const attachments = parseAttachments(value.attachments);
  const ok =
    isId(value.id) &&
    isId(value.ticketId) &&
    oneOf(value.authorType, AUTHORS) &&
    isNullable(value.authorId, isId) &&
    isText(value.authorName) &&
    isText(value.body) &&
    typeof value.isInternal === 'boolean' &&
    isText(value.createdAt) &&
    attachments !== null;
  if (!ok) return null;
  return {
    id: value.id as number,
    ticketId: value.ticketId as number,
    authorType: value.authorType as MessageAuthorType,
    authorId: (value.authorId ?? null) as number | null,
    authorName: value.authorName as string,
    body: value.body as string,
    isInternal: value.isInternal as boolean,
    fileIds: Array.isArray(value.fileIds) ? (value.fileIds as number[]) : [],
    createdAt: value.createdAt as string,
    attachments,
  };
}

/** A list row of the staff view. The seen marks are normalised (a missing one is "none yet"); the words must be the ones the screens know. */
export function parseTicketRow(value: unknown): SupportTicket | null {
  if (!isObject(value) || !isObject(value.requester)) return null;
  const ok =
    isId(value.id) &&
    isText(value.number) &&
    isText(value.subject) &&
    oneOf(value.status, STATUSES) &&
    oneOf(value.priority, PRIORITIES) &&
    oneOf(value.requesterType, REQUESTERS) &&
    oneOf(value.channel, CHANNELS) &&
    oneOf(value.category, CATEGORIES) &&
    isId(value.requesterId) &&
    isText(value.requester.name) &&
    isText(value.createdAt) &&
    isText(value.updatedAt) &&
    isNullable(value.assigneeId ?? null, isId);
  if (!ok) return null;
  const markOrNull = (mark: unknown): number | null => (isId(mark) ? mark : null);
  const timeOrNull = (time: unknown): string | null => (isText(time) ? time : null);
  return {
    ...(value as unknown as SupportTicket),
    assigneeId: markOrNull(value.assigneeId),
    assignee: isObject(value.assignee) ? (value.assignee as SupportTicket['assignee']) : null,
    hasUnread: value.hasUnread === true,
    requesterSeenMessageId: markOrNull(value.requesterSeenMessageId),
    requesterSeenAt: timeOrNull(value.requesterSeenAt),
    staffSeenMessageId: markOrNull(value.staffSeenMessageId),
    staffSeenAt: timeOrNull(value.staffSeenAt),
  };
}

export function parseMessageCreated(data: unknown): TicketMessageCreated | null {
  if (!isObject(data) || !isId(data.ticketId)) return null;
  const message = parseMessage(data.message);
  if (!message || message.ticketId !== data.ticketId) return null;
  return { ticketId: data.ticketId, message, live: data.live === true };
}

export function parseTicketUpdated(data: unknown): TicketUpdated | null {
  if (!isObject(data)) return null;
  const ticket = parseTicketRow(data.ticket);
  return ticket ? { ticket } : null;
}

export function parseTicketRead(data: unknown): TicketRead | null {
  if (!isObject(data)) return null;
  const ok =
    isId(data.ticketId) &&
    (data.by === 'requester' || data.by === 'staff') &&
    isId(data.upToMessageId) &&
    isText(data.at);
  return ok
    ? {
        ticketId: data.ticketId as number,
        by: data.by as TicketRead['by'],
        upToMessageId: data.upToMessageId as number,
        at: data.at as string,
      }
    : null;
}

export function parseTicketTyping(data: unknown): TicketTyping | null {
  if (!isObject(data) || !isId(data.ticketId) || !(data.by === 'requester' || data.by === 'staff'))
    return null;
  const staffId = data.staffId ?? null;
  const staffName = data.staffName ?? null;
  const mode = data.mode ?? null;
  if (!isNullable(staffId, isId) || !isNullable(staffName, isText)) return null;
  if (mode !== null && mode !== 'reply' && mode !== 'note') return null;
  return {
    ticketId: data.ticketId,
    by: data.by,
    staffId: staffId as number | null,
    staffName: staffName as string | null,
    mode,
  };
}

/** True for a message the requester wrote (a customer or a merchant); a reply, a note and a system line are not. */
export function isRequesterMessage(message: Pick<TicketMessage, 'authorType'>): boolean {
  return message.authorType === 'customer' || message.authorType === 'client';
}
