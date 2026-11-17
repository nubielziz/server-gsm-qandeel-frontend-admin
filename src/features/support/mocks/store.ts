// The dev mock store of the support feature, seeded from the demo (`S.tickets` with their messages, `S.macros`) and mapped to API-style
// records (decision 014). Requester names come from the demo's customers and merchants, staff names from its admins. Dev and tests only.
import { Collection } from '@/mocks/db';
import { demoNumericId, demoRows, loadDemoState, toIso, type DemoState } from '@/mocks/seed';
import { demoStaffIds } from '@/mocks/staff';
import type {
  MessageAuthorType,
  ReplyTemplate,
  RequesterType,
  TicketCategory,
  TicketChannel,
  TicketMessage,
  TicketPriority,
  TicketStatus,
} from '../types';
import type { MockFile, MockTicket, SupportState } from './types';

/** A message of a demo ticket: `by` is who wrote it (`note` is an internal note). */
type DemoMessage = { by: 'customer' | 'staff' | 'note'; name: string; ts: number; text: string };

/** A ticket of the demo seed, as the demo stores it (the fields the mock uses). */
type DemoTicket = {
  id: string;
  subject: string;
  channel: TicketChannel;
  who: { type: RequesterType; id: string };
  oid: string | null;
  cat: TicketCategory;
  prio: TicketPriority;
  status: TicketStatus;
  assignee: string | null;
  created: number;
  updated: number;
  firstReplyAt: number | null;
  csat: number | null;
  msgs: DemoMessage[];
};

type DemoMacro = { id: string; title: string; cat: TicketCategory; body: string };
type DemoParty = { id: string; name: string; email: string };

const iso = (ms: number | null): string | null => (ms ? toIso(ms) : null);
const DAY_MS = 86_400_000;

// The demo writes `{name}`; the API's templates use `{{name}}` (MISMATCHES M142).
const toApiVariables = (body: string): string => body.replace(/\{(\w+)\}/g, '{{$1}}');

/** A file a demo message speaks of: the ticket number, the message's place in its thread, and the file. */
type SeededFile = { ticket: string; message: number; filename: string; mime: string; size: number };

/**
 * The files the demo's messages mention but cannot carry (the demo has no attachments): the reply on T-4208 says the receipt "is
 * attached". The mock gives that message the file, so a thread shows an attachment and its download answers on a fresh seed (the
 * contract harvest of the backend reads `GET …/:id/files/:fileId` before any upload). They take the first file ids; uploads follow.
 */
const SEEDED_FILES: readonly SeededFile[] = [
  { ticket: 'T-4208', message: 1, filename: 'receipt-SF-20421.pdf', mime: 'application/pdf', size: 48_213 },
];

function build(demo: DemoState): SupportState {
  const staff = demoStaffIds(demo);
  const customers = new Map(demoRows<DemoParty>(demo, 'customers').map((c) => [c.id, c]));
  const merchants = new Map(demoRows<DemoParty>(demo, 'merchants').map((m) => [m.id, m]));
  let nextMessageId = 1;
  let nextFileId = 1;
  const files = new Map<number, MockFile>();

  /** The seeded files of one demo message, stored as attached uploads of its ticket. */
  const filesOf = (ticket: DemoTicket, index: number, createdAt: string): MockFile[] =>
    SEEDED_FILES.filter((seeded) => seeded.ticket === ticket.id && seeded.message === index).map(
      ({ filename, mime, size }) => {
        const file: MockFile = {
          id: nextFileId++,
          ticketId: demoNumericId(ticket.id),
          filename,
          mime,
          size,
          sha256: '0'.repeat(64),
          createdAt,
          attached: true,
        };
        files.set(file.id, file);
        return file;
      },
    );

  const messageOf = (ticket: DemoTicket, message: DemoMessage, index: number): TicketMessage => {
    const staffId = staff.get(message.name) ?? null;
    const authorType: MessageAuthorType =
      message.by === 'customer'
        ? ticket.who.type
        : message.by === 'note' && message.name === 'System'
          ? 'system'
          : 'staff';
    const attached = filesOf(ticket, index, toIso(message.ts));
    return {
      id: nextMessageId++,
      ticketId: demoNumericId(ticket.id),
      authorType,
      authorId:
        authorType === 'staff' ? staffId : authorType === 'system' ? null : demoNumericId(ticket.who.id),
      authorName: message.name,
      body: message.text,
      isInternal: message.by === 'note',
      fileIds: attached.map((file) => file.id),
      attachments: attached.map(({ id, filename, mime, size }) => ({ id, filename, mime, size })),
      createdAt: toIso(message.ts),
    };
  };

  /**
   * The seen marks a ticket of the demo seed starts with. The team has seen everything of the requester's once it answered after it (or the ticket is
   * resolved); the requester has seen a reply once they wrote again after it (or the ticket is resolved). A requester message with no answer is unread.
   */
  const marksOf = (messages: TicketMessage[], resolved: boolean, resolvedAt: string) => {
    const isRequester = (message: TicketMessage) =>
      message.authorType === 'customer' || message.authorType === 'client';
    const publicStaff = messages.filter((message) => message.authorType === 'staff' && !message.isInternal);
    const requesters = messages.filter(isRequester);
    const newestRequester = requesters.at(-1);
    const lastStaff = publicStaff.at(-1);
    const answered =
      newestRequester && lastStaff && lastStaff.id > newestRequester.id ? lastStaff : undefined;
    const staffSeen = resolved || answered ? newestRequester : undefined;
    // The newest reply that a later requester message follows was seen by them.
    const requesterSeen = resolved
      ? lastStaff
      : publicStaff.findLast((reply) => requesters.some((message) => message.id > reply.id));
    return {
      staffSeenMessageId: staffSeen?.id ?? null,
      staffSeenAt: staffSeen ? (resolved ? resolvedAt : (answered?.createdAt ?? null)) : null,
      requesterSeenMessageId: requesterSeen?.id ?? null,
      requesterSeenAt: requesterSeen
        ? (requesters.find((message) => message.id > requesterSeen.id)?.createdAt ?? resolvedAt)
        : null,
    };
  };

  const tickets = demoRows<DemoTicket>(demo, 'tickets').map((ticket): MockTicket => {
    const party = (ticket.who.type === 'customer' ? customers : merchants).get(ticket.who.id);
    const assigneeId = ticket.assignee ? (staff.get(ticket.assignee) ?? null) : null;
    const messages = ticket.msgs.map((message, index) => messageOf(ticket, message, index));
    return {
      id: demoNumericId(ticket.id),
      number: ticket.id,
      subject: ticket.subject,
      channel: ticket.channel,
      requesterType: ticket.who.type,
      requesterId: demoNumericId(ticket.who.id),
      requester: { name: party?.name ?? 'Customer', email: party?.email ?? null },
      orderId: ticket.oid ? demoNumericId(ticket.oid) : null,
      category: ticket.cat,
      priority: ticket.prio,
      status: ticket.status,
      assigneeId,
      assignee: assigneeId !== null && ticket.assignee ? { id: assigneeId, name: ticket.assignee } : null,
      firstResponseAt: iso(ticket.firstReplyAt),
      resolvedAt: ticket.status === 'resolved' ? toIso(ticket.updated) : null,
      csatScore: ticket.csat,
      createdAt: toIso(ticket.created),
      updatedAt: toIso(ticket.updated),
      // A ticket that came in on Telegram can be answered there too.
      replyChannels: ticket.channel === 'telegram' ? ['email', 'telegram'] : ['email'],
      ...marksOf(messages, ticket.status === 'resolved', toIso(ticket.updated)),
      messages,
    };
  });

  const author = staff.get('Rami K.') ?? null;
  const templates = demoRows<DemoMacro>(demo, 'macros').map((macro): ReplyTemplate => ({
    id: demoNumericId(macro.id),
    title: macro.title,
    category: macro.cat,
    body: toApiVariables(macro.body),
    shortcut: '',
    createdBy: author,
    createdAt: toIso(Date.now() - 60 * DAY_MS),
    updatedAt: toIso(Date.now() - 60 * DAY_MS),
  }));

  return {
    tickets: new Collection(tickets),
    templates: new Collection(templates),
    files,
    nextMessageId,
    nextFileId,
  };
}

let state: Promise<SupportState> | undefined;

/** The support mock data, seeded from the demo on first use. Handlers change it in place. */
export function supportState(): Promise<SupportState> {
  state ??= loadDemoState().then(build);
  return state;
}

/** Drops the data so the next use re-seeds it (tests). */
export function resetSupportStore(): void {
  state = undefined;
}
