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
import type { MockTicket, SupportState } from './types';

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

function build(demo: DemoState): SupportState {
  const staff = demoStaffIds(demo);
  const customers = new Map(demoRows<DemoParty>(demo, 'customers').map((c) => [c.id, c]));
  const merchants = new Map(demoRows<DemoParty>(demo, 'merchants').map((m) => [m.id, m]));
  let nextMessageId = 1;

  const messageOf = (ticket: DemoTicket, message: DemoMessage): TicketMessage => {
    const staffId = staff.get(message.name) ?? null;
    const authorType: MessageAuthorType =
      message.by === 'customer'
        ? ticket.who.type
        : message.by === 'note' && message.name === 'System'
          ? 'system'
          : 'staff';
    return {
      id: nextMessageId++,
      ticketId: demoNumericId(ticket.id),
      authorType,
      authorId:
        authorType === 'staff' ? staffId : authorType === 'system' ? null : demoNumericId(ticket.who.id),
      authorName: message.name,
      body: message.text,
      isInternal: message.by === 'note',
      fileIds: [],
      createdAt: toIso(message.ts),
    };
  };

  const tickets = demoRows<DemoTicket>(demo, 'tickets').map((ticket): MockTicket => {
    const party = (ticket.who.type === 'customer' ? customers : merchants).get(ticket.who.id);
    const assigneeId = ticket.assignee ? (staff.get(ticket.assignee) ?? null) : null;
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
      messages: ticket.msgs.map((message) => messageOf(ticket, message)),
    };
  });

  const author = staff.get('Rami K.') ?? null;
  const templates = demoRows<DemoMacro>(demo, 'macros').map((macro): ReplyTemplate => ({
    id: demoNumericId(macro.id),
    title: macro.title,
    category: macro.cat,
    locale: 'en',
    body: toApiVariables(macro.body),
    shortcut: '',
    createdBy: author,
    createdAt: toIso(Date.now() - 60 * DAY_MS),
    updatedAt: toIso(Date.now() - 60 * DAY_MS),
  }));

  return { tickets: new Collection(tickets), templates: new Collection(templates), nextMessageId };
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
