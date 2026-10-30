// Tests for the support API functions, run against the dev mock API (`mockServer`): each one reaches its route with the path, method,
// query and body of its assumed contract (a recording handler checks that), and reads the answer the way the screens do (the mock
// keeps simple state, so a change can be checked by reading the ticket again).
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { isApiError } from '@/lib/api';
import { mockServer } from '@/mocks/node';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { toListFilters, toListQuery, parseSupportFilters } from '../lib/filters';
import {
  addTicketNote,
  createReplyTemplate,
  deleteReplyTemplate,
  getReplyTemplate,
  getSupportTicket,
  listReplyTemplates,
  listSupportTickets,
  replyToTicket,
  supportResources,
  updateReplyTemplate,
  updateSupportTicket,
} from '.';

setupMockApi();
// Every test starts signed in as Rami, the Owner (staff id 1).
beforeEach(async () => {
  await signInAs();
});

// Tickets of the mock seed (the demo's).
const LATE = 4202; // Victor Silva, high, last word is the customer's, 2h target passed
const WAITING = 4206; // Victor Silva, pending: the team wrote last
const RESOLVED = 4209; // Kevin Doyle
const NEW_ONE = 4201; // Jessica Moore, nobody answered
const MERCHANT = 4213; // Cairo GSM Lab

type Seen = { method: string; path: string; params: URLSearchParams; body: unknown };

/** Records the requests a route gets (method, path, query and JSON body), then answers with `reply`. */
function recording(
  method: 'get' | 'post' | 'patch' | 'delete',
  pattern: string,
  reply: () => Response,
): Seen[] {
  const seen: Seen[] = [];
  mockServer.use(
    http[method](pattern, async ({ request }) => {
      const url = new URL(request.url);
      const text = await request.clone().text();
      seen.push({
        method: request.method,
        path: url.pathname,
        params: url.searchParams,
        body: text ? JSON.parse(text) : undefined,
      });
      return reply();
    }),
  );
  return seen;
}

describe('what each function sends', () => {
  it('lists tickets with the simple-rest query: range, sort, text and field filters', async () => {
    const seen = recording('get', '*/admin/support-tickets', () =>
      HttpResponse.json([], { headers: { 'x-total-count': '0' } }),
    );
    await listSupportTickets(
      toListQuery(
        {
          status: ['new', 'open', 'pending'],
          requesterType: 'customer',
          requesterId: 28,
          assigneeId: 1,
          q: 'unlock',
        },
        { start: 25, end: 50, sort: ['late', 'updatedAt'], order: ['desc', 'desc'] },
      ),
    );
    expect(seen[0].path).toBe('/admin/support-tickets');
    const params = seen[0].params;
    expect(params.get('_start')).toBe('25');
    expect(params.get('_end')).toBe('50');
    expect(params.get('_sort')).toBe('late,updatedAt');
    expect(params.get('_order')).toBe('desc,desc');
    expect(params.get('q')).toBe('unlock');
    expect(params.getAll('status')).toEqual(['new', 'open', 'pending']);
    expect(params.get('requesterType')).toBe('customer');
    expect(params.get('requesterId')).toBe('28');
    expect(params.get('assigneeId')).toBe('1');
  });

  it('reads one ticket and changes one, sending only what changes', async () => {
    const one = recording('get', '*/admin/support-tickets/:id', () => HttpResponse.json({ id: 7 }));
    await getSupportTicket(7);
    expect(one[0]).toMatchObject({ method: 'GET', path: '/admin/support-tickets/7' });

    const edit = recording('patch', '*/admin/support-tickets/:id', () => HttpResponse.json({ id: 7 }));
    await updateSupportTicket(7, { priority: 'low' });
    await updateSupportTicket(7, { assigneeId: null });
    await updateSupportTicket(7, { status: 'resolved' });
    expect(edit.map((call) => [call.method, call.path, call.body])).toEqual([
      ['PATCH', '/admin/support-tickets/7', { priority: 'low' }],
      ['PATCH', '/admin/support-tickets/7', { assigneeId: null }],
      ['PATCH', '/admin/support-tickets/7', { status: 'resolved' }],
    ]);
  });

  it('sends a reply and a note to their own routes', async () => {
    const reply = recording('post', '*/admin/support-tickets/:id/reply', () =>
      HttpResponse.json({ id: 1 }, { status: 201 }),
    );
    const note = recording('post', '*/admin/support-tickets/:id/note', () =>
      HttpResponse.json({ id: 2 }, { status: 201 }),
    );
    await replyToTicket(7, { body: 'Hello', channel: 'telegram' });
    await replyToTicket(7, { body: 'Again' });
    await addTicketNote(7, { body: 'Only us' });
    expect(reply.map((call) => [call.path, call.body])).toEqual([
      ['/admin/support-tickets/7/reply', { body: 'Hello', channel: 'telegram' }],
      ['/admin/support-tickets/7/reply', { body: 'Again' }],
    ]);
    expect(note[0]).toMatchObject({
      method: 'POST',
      path: '/admin/support-tickets/7/note',
      body: { body: 'Only us' },
    });
  });

  it('lists, reads, adds, edits and deletes reply templates', async () => {
    const list = recording('get', '*/admin/reply-templates', () =>
      HttpResponse.json([], { headers: { 'x-total-count': '0' } }),
    );
    await listReplyTemplates({ start: 0, end: 200, sort: ['title'], order: ['asc'] });
    expect(list[0].path).toBe('/admin/reply-templates');
    expect(list[0].params.get('_end')).toBe('200');

    const one = recording('get', '*/admin/reply-templates/:id', () => HttpResponse.json({ id: 3 }));
    await getReplyTemplate(3);
    expect(one[0].path).toBe('/admin/reply-templates/3');

    const body = {
      title: 'Hi',
      category: 'other' as const,
      locale: 'en',
      body: 'Hi {{name}}',
      shortcut: '/hi',
    };
    const create = recording('post', '*/admin/reply-templates', () =>
      HttpResponse.json({ id: 9 }, { status: 201 }),
    );
    await createReplyTemplate(body);
    expect(create[0]).toMatchObject({ method: 'POST', path: '/admin/reply-templates', body });

    const edit = recording('patch', '*/admin/reply-templates/:id', () => HttpResponse.json({ id: 9 }));
    await updateReplyTemplate(9, { title: 'Hello' });
    expect(edit[0]).toMatchObject({
      method: 'PATCH',
      path: '/admin/reply-templates/9',
      body: { title: 'Hello' },
    });

    const remove = recording(
      'delete',
      '*/admin/reply-templates/:id',
      () => new HttpResponse(null, { status: 204 }),
    );
    await expect(deleteReplyTemplate(9)).resolves.toBeUndefined();
    expect(remove[0]).toMatchObject({ method: 'DELETE', path: '/admin/reply-templates/9' });
  });

  it('registers the two Refine resources with only the operations their routes offer', () => {
    expect(Object.keys(supportResources)).toEqual(['support-tickets', 'reply-templates']);
    expect(Object.keys(supportResources['support-tickets']).sort()).toEqual(['list', 'show', 'update']);
    expect(Object.keys(supportResources['reply-templates']).sort()).toEqual([
      'create',
      'delete',
      'list',
      'show',
      'update',
    ]);
  });
});

describe('listing tickets', () => {
  const total = async (query: string) =>
    (
      await listSupportTickets(
        toListQuery(toListFilters(parseSupportFilters(new URLSearchParams(query)), 1), { start: 0, end: 1 }),
      )
    ).total;

  it('counts every filter with a one-row call and reads the total from the header', async () => {
    expect(await total('')).toBe(10);
    expect(await total('filter=late')).toBe(4);
    expect(await total('filter=mine')).toBe(2);
    expect(await total('filter=resolved')).toBe(5);
    expect(await total('filter=all')).toBe(15);
    expect(await total('filter=all&who=merchants')).toBe(3);
    expect((await listSupportTickets({ filters: { status: 'new' }, start: 0, end: 1 })).total).toBe(4);
  });

  it('puts the requester, the assignee and the three timers on each row', async () => {
    const { data } = await listSupportTickets({ filters: { requesterId: 28 }, sort: ['id'], order: ['asc'] });
    const late = data.find((row) => row.id === LATE);
    expect(late).toMatchObject({
      number: 'T-4202',
      status: 'open',
      priority: 'high',
      channel: 'web',
      category: 'failed_unlock',
      requesterType: 'customer',
      requester: { name: 'Victor Silva' },
      orderId: 20471,
      assignee: { name: 'Lina S.' },
      late: true,
    });
    expect(late?.lastPublicAt).toBeTruthy();
    expect(late?.slaDueAt).toBeTruthy();
    // The team wrote last, so nobody is waiting for a reply.
    expect(data.find((row) => row.id === WAITING)).toMatchObject({ late: false, slaDueAt: null });
  });

  it('sorts the late tickets first, then by activity, and searches number, subject and name', async () => {
    const { data } = await listSupportTickets({
      filters: { status: ['new', 'open', 'pending'] },
      sort: ['late', 'updatedAt'],
      order: ['desc', 'desc'],
    });
    expect(data.slice(0, 4).every((row) => row.late)).toBe(true);
    expect(data.slice(4).some((row) => row.late)).toBe(false);
    expect((await listSupportTickets({ q: 'T-4212' })).data.map((row) => row.id)).toEqual([4212]);
    expect((await listSupportTickets({ q: 'cairo' })).data.map((row) => row.id)).toEqual([MERCHANT]);
    expect((await listSupportTickets({ q: 'chargeback' })).data.map((row) => row.id)).toEqual([4212]);
  });
});

describe('reading one ticket', () => {
  it('sends the whole thread, oldest first, and the channels a reply can use', async () => {
    const ticket = await getSupportTicket(4212);
    expect(ticket.messages.map((message) => [message.authorType, message.isInternal])).toEqual([
      ['customer', false],
      ['staff', true],
    ]);
    expect(ticket.messages[0]).toMatchObject({ authorName: 'Jack', authorId: 19 });
    expect(ticket.replyChannels).toEqual(['email']);
    expect((await getSupportTicket(4207)).replyChannels).toEqual(['email', 'telegram']);
    expect((await getSupportTicket(MERCHANT)).messages.map((message) => message.authorType)).toEqual([
      'client',
      'staff',
    ]);
  });

  it('answers 404 for a ticket that does not exist', async () => {
    const error = await getSupportTicket(9999).catch((caught: unknown) => caught);
    expect(isApiError(error) && error.status).toBe(404);
  });
});

describe('changing a ticket', () => {
  it('changes the priority and the assignee, and keeps them', async () => {
    expect(await updateSupportTicket(NEW_ONE, { priority: 'low', assigneeId: 3 })).toMatchObject({
      priority: 'low',
      assigneeId: 3,
      assignee: { id: 3, name: 'Omar T.' },
    });
    expect(await getSupportTicket(NEW_ONE)).toMatchObject({ priority: 'low', assignee: { name: 'Omar T.' } });
    expect(await updateSupportTicket(NEW_ONE, { assigneeId: null })).toMatchObject({
      assigneeId: null,
      assignee: null,
    });
  });

  it('resolves with a note in the thread, and reopens', async () => {
    const resolved = await updateSupportTicket(LATE, { status: 'resolved' });
    expect(resolved).toMatchObject({ status: 'resolved', late: false });
    const thread = await getSupportTicket(LATE);
    expect(thread.messages.at(-1)).toMatchObject({ authorType: 'system', isInternal: true });
    expect(thread.messages.at(-1)?.body).toMatch(/Marked resolved by Rami K\./);
    expect(await updateSupportTicket(LATE, { status: 'open' })).toMatchObject({ status: 'open' });
  });

  it('refuses a priority, a status or a person it does not know, with a message per field', async () => {
    const error = await updateSupportTicket(LATE, {
      priority: 'urgent' as never,
      status: 'pending' as never,
      assigneeId: 999,
    }).catch((caught: unknown) => caught);
    expect(isApiError(error) && error.status).toBe(422);
    expect(isApiError(error) && Object.keys(error.fieldErrors).sort()).toEqual([
      'assigneeId',
      'priority',
      'status',
    ]);
  });
});

describe('answering a ticket', () => {
  it('adds the reply to the thread, stamps the first reply and moves a new ticket to Waiting on customer', async () => {
    const message = await replyToTicket(NEW_ONE, { body: '  Looking into it.  ' });
    expect(message).toMatchObject({
      authorType: 'staff',
      authorName: 'Rami K.',
      body: 'Looking into it.',
      isInternal: false,
    });
    const ticket = await getSupportTicket(NEW_ONE);
    expect(ticket).toMatchObject({ status: 'pending', firstResponseAt: message.createdAt, late: false });
    // Whoever answers takes a ticket nobody had.
    expect(ticket.assignee).toMatchObject({ name: 'Rami K.' });
    expect(ticket.messages.at(-1)?.id).toBe(message.id);
  });

  it('adds a note without changing the status', async () => {
    const message = await addTicketNote(NEW_ONE, { body: 'Supplier is slow today.' });
    expect(message).toMatchObject({ isInternal: true, authorType: 'staff' });
    expect(await getSupportTicket(NEW_ONE)).toMatchObject({ status: 'new', firstResponseAt: null });
  });

  it('refuses an empty reply with a message on the text, and a channel the ticket cannot use', async () => {
    const empty = await replyToTicket(NEW_ONE, { body: '   ' }).catch((caught: unknown) => caught);
    expect(isApiError(empty) && empty.fieldErrors.body).toEqual(['Write a reply first.']);
    const channel = await replyToTicket(NEW_ONE, { body: 'Hi', channel: 'telegram' }).catch(
      (caught: unknown) => caught,
    );
    expect(isApiError(channel) && channel.fieldErrors.channel).toBeTruthy();
  });

  it('refuses a reply to a resolved ticket with TICKET_RESOLVED, but takes a note', async () => {
    const error = await replyToTicket(RESOLVED, { body: 'Hi' }).catch((caught: unknown) => caught);
    expect(isApiError(error) && [error.status, error.code]).toEqual([409, 'TICKET_RESOLVED']);
    await expect(addTicketNote(RESOLVED, { body: 'Late note' })).resolves.toMatchObject({ isInternal: true });
  });

  it('answers 404 for a ticket that does not exist', async () => {
    const error = await replyToTicket(9999, { body: 'Hi' }).catch((caught: unknown) => caught);
    expect(isApiError(error) && error.status).toBe(404);
  });
});

describe('reply templates', () => {
  it('lists the demo’s eight macros with the API’s {{variables}}', async () => {
    const { data, total } = await listReplyTemplates({ sort: ['title'], order: ['asc'] });
    expect(total).toBe(8);
    expect(data.map((template) => template.title)[0]).toBe('Eligibility question');
    const progress = data.find((template) => template.title === 'Order is in progress');
    expect(progress).toMatchObject({ category: 'delay', locale: 'en' });
    expect(progress?.body).toContain('Hi {{name}}, thanks for your patience. Your order {{order}}');
    expect(progress?.body).toContain('{{eta}}');
    expect((await listReplyTemplates({ filters: { category: 'refund' } })).total).toBe(2);
  });

  it('adds, edits and deletes a template', async () => {
    const created = await createReplyTemplate({
      title: '  Thanks  ',
      category: 'other',
      locale: 'en',
      body: 'Thanks {{name}}',
      shortcut: '/thanks',
    });
    expect(created).toMatchObject({ title: 'Thanks', shortcut: '/thanks', createdBy: 1 });
    expect(await getReplyTemplate(created.id)).toMatchObject({ title: 'Thanks' });

    expect(await updateReplyTemplate(created.id, { title: 'Thank you', shortcut: '' })).toMatchObject({
      title: 'Thank you',
      shortcut: '',
      body: 'Thanks {{name}}',
    });
    await deleteReplyTemplate(created.id);
    expect((await listReplyTemplates()).total).toBe(8);
    const error = await getReplyTemplate(created.id).catch((caught: unknown) => caught);
    expect(isApiError(error) && error.status).toBe(404);
  });

  it('refuses missing fields, a shortcut without a slash and a shortcut another template has', async () => {
    const empty = await createReplyTemplate({
      title: ' ',
      category: 'other',
      locale: 'en',
      body: '',
      shortcut: '',
    }).catch((caught: unknown) => caught);
    expect(isApiError(empty) && Object.keys(empty.fieldErrors).sort()).toEqual(['body', 'title']);

    const noSlash = await createReplyTemplate({
      title: 'A',
      category: 'other',
      locale: 'en',
      body: 'x',
      shortcut: 'a',
    }).catch((caught: unknown) => caught);
    expect(isApiError(noSlash) && noSlash.fieldErrors.shortcut).toBeTruthy();

    await createReplyTemplate({ title: 'A', category: 'other', locale: 'en', body: 'x', shortcut: '/a' });
    const taken = await createReplyTemplate({
      title: 'B',
      category: 'other',
      locale: 'en',
      body: 'x',
      shortcut: '/a',
    }).catch((caught: unknown) => caught);
    expect(isApiError(taken) && [taken.status, taken.code]).toEqual([409, 'SHORTCUT_TAKEN']);
  });

  it('answers 404 when the template does not exist', async () => {
    for (const call of [() => updateReplyTemplate(999, { title: 'x' }), () => deleteReplyTemplate(999)]) {
      const error = await call().catch((caught: unknown) => caught);
      expect(isApiError(error) && error.status).toBe(404);
    }
  });
});
