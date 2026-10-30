// Mock of `GET /admin/support-tickets`, `GET /admin/support-tickets/:id`, `PATCH /admin/support-tickets/:id`, `POST …/:id/reply` and
// `POST …/:id/note`: the inbox with filters, sort and `x-total-count`, the thread, the priority / assignee / status changes, and the
// reply and note that append a message. The only refusals are bad input and a reply on a resolved ticket. Dev and tests only.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { applyListQuery } from '@/mocks/crud';
import { bodyOf, invalid, notFound, textOf } from '@/mocks/handlers/accessShared';
import { latency } from '@/mocks/latency';
import { problem, type ProblemError } from '@/mocks/problem';
import { currentStaff, guard } from '@/mocks/session';
import { staffStore } from '@/mocks/staff';
import type { ReplyChannel, TicketMessage, TicketPriority } from '../types';
import { toDetail, toTicket } from './dto';
import { supportState } from './store';
import type { MockTicket, SupportState } from './types';

const SEARCH_FIELDS = ['number', 'subject', 'requester.name'];
const PRIORITIES: readonly TicketPriority[] = ['high', 'normal', 'low'];

// A message written by the signed-in staff member now; `internal` makes it a note.
async function staffMessage(
  state: SupportState,
  ticket: MockTicket,
  body: string,
  internal: boolean,
): Promise<TicketMessage> {
  const me = await currentStaff();
  return {
    id: state.nextMessageId++,
    ticketId: ticket.id,
    authorType: 'staff',
    authorId: me?.id ?? null,
    authorName: me?.name ?? 'Staff',
    body,
    isInternal: internal,
    fileIds: [],
    createdAt: new Date().toISOString(),
  };
}

// What a reply or note does to the ticket besides the new message: the first public reply stamps the first-response time and moves a
// new or open ticket to "Waiting on customer"; whoever answers takes an unassigned ticket (the demo's `ticketReply`).
async function noteActivity(ticket: MockTicket, internal: boolean, message: TicketMessage): Promise<void> {
  ticket.messages.push(message);
  if (!internal) {
    ticket.firstResponseAt ??= message.createdAt;
    if (ticket.status === 'new' || ticket.status === 'open') ticket.status = 'pending';
  }
  const me = await currentStaff();
  if (!ticket.assignee && me) {
    ticket.assignee = { id: me.id, name: me.name };
    ticket.assigneeId = me.id;
  }
  ticket.updatedAt = message.createdAt;
}

// The write route shared by reply and note: find the ticket, check the text, add the message.
function messageHandler(route: 'reply' | 'note'): HttpHandler {
  const internal = route === 'note';
  return http.post(`*/admin/support-tickets/:id/${route}`, async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const state = await supportState();
    const ticket = state.tickets.find(String(params.id));
    if (!ticket) return notFound('ticket', params.id);
    const body = await bodyOf(request);
    const text = textOf(body.body);
    const errors: ProblemError[] = [
      ...(text
        ? []
        : [{ field: 'body', message: internal ? 'Write the note first.' : 'Write a reply first.' }]),
      ...(!internal &&
      body.channel !== undefined &&
      !ticket.replyChannels.includes(body.channel as ReplyChannel)
        ? [{ field: 'channel', message: 'This ticket cannot be answered on that channel.' }]
        : []),
    ];
    if (errors.length > 0) return invalid(errors);
    if (!internal && ticket.status === 'resolved') {
      return problem(409, 'TICKET_RESOLVED', 'Ticket is resolved', 'Reopen the ticket before you reply.');
    }
    const message = await staffMessage(state, ticket, text, internal);
    await noteActivity(ticket, internal, message);
    return HttpResponse.json(message, { status: 201 });
  });
}

export const ticketHandlers: HttpHandler[] = [
  messageHandler('reply'),
  messageHandler('note'),

  http.get('*/admin/support-tickets', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const state = await supportState();
    const rows = state.tickets.list().map((row) => toTicket(row));
    const { page, total } = applyListQuery(rows, new URL(request.url).searchParams, SEARCH_FIELDS);
    return HttpResponse.json(page, {
      headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
    });
  }),

  http.get('*/admin/support-tickets/:id', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const row = (await supportState()).tickets.find(String(params.id));
    return row ? HttpResponse.json(toDetail(row)) : notFound('ticket', params.id);
  }),

  http.patch('*/admin/support-tickets/:id', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const state = await supportState();
    const ticket = state.tickets.find(String(params.id));
    if (!ticket) return notFound('ticket', params.id);
    const body = await bodyOf(request);
    const errors: ProblemError[] = [];
    if (body.priority !== undefined && !PRIORITIES.includes(body.priority as TicketPriority)) {
      errors.push({ field: 'priority', message: 'Choose high, normal or low.' });
    }
    if (body.status !== undefined && body.status !== 'open' && body.status !== 'resolved') {
      errors.push({ field: 'status', message: 'A ticket can be resolved or reopened.' });
    }
    const person =
      typeof body.assigneeId === 'number' ? (await staffStore()).find(body.assigneeId) : undefined;
    if (body.assigneeId !== undefined && body.assigneeId !== null && !person) {
      errors.push({ field: 'assigneeId', message: 'Choose someone on the team.' });
    }
    if (errors.length > 0) return invalid(errors);

    const me = await currentStaff();
    const now = new Date().toISOString();
    let changed = false;
    if (body.priority !== undefined && body.priority !== ticket.priority) {
      ticket.priority = body.priority as TicketPriority;
      changed = true;
    }
    if (body.assigneeId !== undefined && (body.assigneeId ?? null) !== ticket.assigneeId) {
      ticket.assigneeId = person ? person.id : null;
      ticket.assignee = person ? { id: person.id, name: person.name } : null;
      changed = true;
    }
    if (body.status === 'resolved' && ticket.status !== 'resolved') {
      ticket.status = 'resolved';
      ticket.resolvedAt = now;
      // The demo's note in the thread: who resolved it, and that the survey went out.
      ticket.messages.push({
        id: state.nextMessageId++,
        ticketId: ticket.id,
        authorType: 'system',
        authorId: null,
        authorName: 'System',
        body: `Marked resolved by ${me?.name ?? 'staff'}. A satisfaction survey is emailed to the customer.`,
        isInternal: true,
        fileIds: [],
        createdAt: now,
      });
      changed = true;
    } else if (body.status === 'open' && ticket.status === 'resolved') {
      ticket.status = 'open';
      ticket.resolvedAt = null;
      changed = true;
    }
    if (changed) ticket.updatedAt = now;
    return HttpResponse.json(toTicket(ticket));
  }),
];
