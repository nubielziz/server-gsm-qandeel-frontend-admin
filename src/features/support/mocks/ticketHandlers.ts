// Mock of `GET /admin/support-tickets`, `GET /admin/support-tickets/:id`, `PATCH /admin/support-tickets/:id`, `POST …/:id/reply` and
// `POST …/:id/note`: the inbox with filters, sort and `x-total-count`, the thread, the priority / assignee / status changes, and the
// reply and note that append a message (with the files uploaded before, and a push on the dev stream). The only refusals are bad input
// and a reply on a resolved ticket. Dev and tests only.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { applyListQuery } from '@/mocks/crud';
import { bodyOf, invalid, notFound, textOf } from '@/mocks/handlers/accessShared';
import { latency } from '@/mocks/latency';
import { problem, type ProblemError } from '@/mocks/problem';
import { currentStaff, guard } from '@/mocks/session';
import { staffStore } from '@/mocks/staff';
import type { ReplyChannel, TicketMessage, TicketPriority } from '../types';
import { toDetail, toTicket } from './dto';
import { playEcho, wantsEcho } from './echo';
import { pushMessage, pushMessageAndTicket, pushTicket } from './liveEvents';
import { supportState } from './store';
import type { MockFile, MockTicket, SupportState } from './types';

const SEARCH_FIELDS = ['number', 'subject', 'requester.name'];

// The list filter `rankKind` reads the requester's rank, which a row keeps under `requester`.
function withRankFilter(params: URLSearchParams): URLSearchParams {
  return new URLSearchParams(
    [...params].map(([key, value]) => [key === 'rankKind' ? 'requester.rankKind' : key, value]),
  );
}
const PRIORITIES: readonly TicketPriority[] = ['high', 'normal', 'low'];

// A message written by the signed-in staff member now; `internal` makes it a note. `files` are the uploads it carries.
async function staffMessage(
  state: SupportState,
  ticket: MockTicket,
  body: string,
  internal: boolean,
  files: readonly MockFile[],
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
    fileIds: files.map((file) => file.id),
    attachments: files.map(({ id, filename, mime, size }) => ({ id, filename, mime, size })),
    createdAt: new Date().toISOString(),
  };
}

const MAX_FILES = 5;

// The files a body names: each must be an upload of this ticket that no message has taken yet. Anything else is a 422 on `fileIds`.
function filesOf(
  state: SupportState,
  ticket: MockTicket,
  value: unknown,
): { files: MockFile[]; errors: ProblemError[] } {
  if (value === undefined) return { files: [], errors: [] };
  if (!Array.isArray(value))
    return { files: [], errors: [{ field: 'fileIds', message: 'Send a list of file ids.' }] };
  if (value.length > MAX_FILES)
    return { files: [], errors: [{ field: 'fileIds', message: 'Attach at most 5 files.' }] };
  const files = value.map((id) => state.files.get(Number(id)));
  const usable = files.every((file) => file !== undefined && file.ticketId === ticket.id && !file.attached);
  return usable
    ? { files: files as MockFile[], errors: [] }
    : {
        files: [],
        errors: [{ field: 'fileIds', message: 'One of the files is not available. Attach it again.' }],
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
    const { files, errors: fileErrors } = filesOf(state, ticket, body.fileIds);
    // A message may be files only: the text is needed when there is no file.
    const errors: ProblemError[] = [
      ...(text || files.length > 0
        ? []
        : [{ field: 'body', message: internal ? 'Write the note first.' : 'Write a reply first.' }]),
      ...fileErrors,
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
    const message = await staffMessage(state, ticket, text, internal, files);
    for (const file of files) file.attached = true;
    await noteActivity(ticket, internal, message);
    pushMessageAndTicket(ticket, message);
    if (wantsEcho(message)) playEcho(state, ticket, message);
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
    const params = new URL(request.url).searchParams;
    // A requester is always an account: the words of the old model are refused, as the server does (decision 023).
    const requesterType = params.get('requesterType');
    if (requesterType !== null && requesterType !== 'account') {
      return invalid([{ field: 'requesterType', message: 'The requester is an account.' }]);
    }
    const state = await supportState();
    const rows = state.tickets.list().map((row) => toTicket(row));
    const { page, total } = applyListQuery(rows, withRankFilter(params), SEARCH_FIELDS);
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
      // The demo's note in the thread: who resolved it.
      ticket.messages.push({
        id: state.nextMessageId++,
        ticketId: ticket.id,
        authorType: 'system',
        authorId: null,
        authorName: 'System',
        body: `Marked resolved by ${me?.name ?? 'staff'}.`,
        isInternal: true,
        fileIds: [],
        attachments: [],
        createdAt: now,
      });
      pushMessage(ticket.messages[ticket.messages.length - 1]);
      changed = true;
    } else if (body.status === 'open' && ticket.status === 'resolved') {
      ticket.status = 'open';
      ticket.resolvedAt = null;
      changed = true;
    }
    if (changed) {
      ticket.updatedAt = now;
      pushTicket(ticket);
    }
    return HttpResponse.json(toTicket(ticket));
  }),
];
