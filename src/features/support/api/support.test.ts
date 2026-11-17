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
  markTicketRead,
  replyToTicket,
  sendTicketTyping,
  supportResources,
  ticketFileUrl,
  updateReplyTemplate,
  updateSupportTicket,
  uploadTicketFile,
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
const RECEIPT = 4208; // Oscar, resolved: the team's reply carries the seeded receipt (file 1)

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

  it('sends the files of a reply and a note as `fileIds`', async () => {
    const reply = recording('post', '*/admin/support-tickets/:id/reply', () =>
      HttpResponse.json({ id: 1 }, { status: 201 }),
    );
    const note = recording('post', '*/admin/support-tickets/:id/note', () =>
      HttpResponse.json({ id: 2 }, { status: 201 }),
    );
    await replyToTicket(7, { body: '', fileIds: [3, 4] });
    await addTicketNote(7, { body: 'See the file', fileIds: [5] });
    expect(reply[0].body).toEqual({ body: '', fileIds: [3, 4] });
    expect(note[0].body).toEqual({ body: 'See the file', fileIds: [5] });
  });

  it('marks a ticket read up to a message, with the id in the body (feature 28, B218)', async () => {
    const read = recording(
      'post',
      '*/admin/support-tickets/:id/read',
      () => new HttpResponse(null, { status: 204 }),
    );
    await expect(markTicketRead(7, { upToMessageId: 31 })).resolves.toBeUndefined();
    expect(read[0]).toMatchObject({
      method: 'POST',
      path: '/admin/support-tickets/7/read',
      body: { upToMessageId: 31 },
    });
  });

  it('tells the server the staff member is typing a reply or a note', async () => {
    const typing = recording(
      'post',
      '*/admin/support-tickets/:id/typing',
      () => new HttpResponse(null, { status: 204 }),
    );
    await sendTicketTyping(7, { mode: 'reply' });
    await sendTicketTyping(7, { mode: 'note' });
    expect(typing.map((call) => [call.path, call.body])).toEqual([
      ['/admin/support-tickets/7/typing', { mode: 'reply' }],
      ['/admin/support-tickets/7/typing', { mode: 'note' }],
    ]);
  });

  it('uploads one file as multipart with the part named `file`, and gives the link of a download without asking', async () => {
    let contentType = '';
    mockServer.use(
      http.post('*/admin/support-tickets/:id/files', ({ request }) => {
        contentType = request.headers.get('content-type') ?? '';
        return HttpResponse.json(
          {
            id: 9,
            filename: 'a.pdf',
            size: 3,
            mime: 'application/pdf',
            sha256: '0'.repeat(64),
            createdAt: '2026-11-15T10:00:00.000Z',
          },
          { status: 201 },
        );
      }),
    );
    const stored = await uploadTicketFile(7, {
      file: new File(['abc'], 'a.pdf', { type: 'application/pdf' }),
    });
    expect(stored.id).toBe(9);
    expect(contentType).toMatch(/^multipart\/form-data; boundary=/);
    expect(ticketFileUrl(7, 9)).toBe('http://api.test/admin/support-tickets/7/files/9');
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

describe('the live routes of the mock (feature 28)', () => {
  it('moves the team’s seen mark forward only, to the newest requester message up to the one given', async () => {
    const before = await getSupportTicket(LATE);
    expect(before).toMatchObject({ staffSeenMessageId: null, hasUnread: true });
    await markTicketRead(LATE, { upToMessageId: 3 });
    const after = await getSupportTicket(LATE);
    expect(after).toMatchObject({ staffSeenMessageId: 3, hasUnread: false });
    // A lower message id changes nothing.
    await markTicketRead(LATE, { upToMessageId: 2 });
    expect((await getSupportTicket(LATE)).staffSeenMessageId).toBe(3);
  });

  it('refuses a message that is not part of the ticket, and a typing mode it does not know', async () => {
    const read = await markTicketRead(LATE, { upToMessageId: 9999 }).catch((caught: unknown) => caught);
    expect(isApiError(read) && [read.status, Object.keys(read.fieldErrors)]).toEqual([
      422,
      ['upToMessageId'],
    ]);
    const typing = await sendTicketTyping(LATE, { mode: 'shout' as never }).catch(
      (caught: unknown) => caught,
    );
    expect(isApiError(typing) && typing.fieldErrors.mode).toBeTruthy();
    const missing = await markTicketRead(9999, { upToMessageId: 1 }).catch((caught: unknown) => caught);
    expect(isApiError(missing) && missing.status).toBe(404);
  });

  it('keeps an uploaded file for the reply that names it, once', async () => {
    const stored = await uploadTicketFile(NEW_ONE, {
      file: new File(['abc'], 'proof.pdf', { type: 'application/pdf' }),
    });
    expect(stored).toMatchObject({ mime: 'application/pdf' });
    const message = await replyToTicket(NEW_ONE, { body: '', fileIds: [stored.id] });
    expect(message.fileIds).toEqual([stored.id]);
    expect(message.attachments.map((file) => file.id)).toEqual([stored.id]);
    // The file belongs to that message now.
    const again = await replyToTicket(NEW_ONE, { body: 'x', fileIds: [stored.id] }).catch(
      (caught: unknown) => caught,
    );
    expect(isApiError(again) && again.fieldErrors.fileIds).toBeTruthy();
    // And a file of another ticket is not available.
    const other = await uploadTicketFile(LATE, {
      file: new File(['abc'], 'other.png', { type: 'image/png' }),
    });
    const foreign = await replyToTicket(NEW_ONE, { body: 'x', fileIds: [other.id] }).catch(
      (caught: unknown) => caught,
    );
    expect(isApiError(foreign) && foreign.fieldErrors.fileIds).toBeTruthy();
  });

  it('refuses a file that is not a PDF, JPEG or PNG, six files, and an empty reply with no file', async () => {
    const exe = await uploadTicketFile(LATE, {
      file: new File(['abc'], 'tool.exe', { type: 'application/x-msdownload' }),
    }).catch((caught: unknown) => caught);
    expect(isApiError(exe) && exe.fieldErrors.file).toBeTruthy();
    const six = await replyToTicket(LATE, { body: 'x', fileIds: [1, 2, 3, 4, 5, 6] }).catch(
      (caught: unknown) => caught,
    );
    expect(isApiError(six) && six.fieldErrors.fileIds).toEqual(['Attach at most 5 files.']);
    const empty = await replyToTicket(LATE, { body: ' ', fileIds: [] }).catch((caught: unknown) => caught);
    expect(isApiError(empty) && empty.fieldErrors.body).toBeTruthy();
  });

  it('seeds the receipt the demo’s reply on T-4208 speaks of, and serves it as a download', async () => {
    const ticket = await getSupportTicket(RECEIPT);
    const reply = ticket.messages.find((message) => message.attachments.length > 0);
    expect(reply).toMatchObject({ authorType: 'staff', fileIds: [1] });
    expect(reply?.attachments).toEqual([
      { id: 1, filename: 'receipt-SF-20421.pdf', mime: 'application/pdf', size: 48_213 },
    ]);
    const download = await fetch(ticketFileUrl(RECEIPT, 1));
    expect([download.status, download.headers.get('content-disposition')]).toEqual([
      200,
      'attachment; filename="receipt-SF-20421.pdf"',
    ]);
    // The seeded file is taken: a reply cannot attach it again, and the next upload gets the next id.
    const again = await addTicketNote(RECEIPT, { body: 'x', fileIds: [1] }).catch(
      (caught: unknown) => caught,
    );
    expect(isApiError(again) && again.fieldErrors.fileIds).toBeTruthy();
    const next = await uploadTicketFile(RECEIPT, {
      file: new File(['abc'], 'b.pdf', { type: 'application/pdf' }),
    });
    expect(next.id).toBe(2);
  });

  it('sends the seen marks and the attachments the screens read', async () => {
    const ticket = await getSupportTicket(LATE);
    expect(ticket.requesterSeenMessageId).toBe(2);
    expect(ticket.messages.every((message) => Array.isArray(message.attachments))).toBe(true);
    const list = await listSupportTickets({ q: 'T-4202' });
    expect(list.data[0]).toMatchObject({ hasUnread: true, staffSeenMessageId: null });
  });
});

describe('reply templates', () => {
  it('lists the demo’s eight macros with the API’s {{variables}}', async () => {
    const { data, total } = await listReplyTemplates({ sort: ['title'], order: ['asc'] });
    expect(total).toBe(8);
    expect(data.map((template) => template.title)[0]).toBe('Eligibility question');
    const progress = data.find((template) => template.title === 'Order is in progress');
    expect(progress).toMatchObject({ category: 'delay' });
    expect(progress?.body).toContain('Hi {{name}}, thanks for your patience. Your order {{order}}');
    expect(progress?.body).toContain('{{eta}}');
    expect((await listReplyTemplates({ filters: { category: 'refund' } })).total).toBe(2);
  });

  it('adds, edits and deletes a template', async () => {
    const created = await createReplyTemplate({
      title: '  Thanks  ',
      category: 'other',
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
      body: '',
      shortcut: '',
    }).catch((caught: unknown) => caught);
    expect(isApiError(empty) && Object.keys(empty.fieldErrors).sort()).toEqual(['body', 'title']);

    const noSlash = await createReplyTemplate({
      title: 'A',
      category: 'other',
      body: 'x',
      shortcut: 'a',
    }).catch((caught: unknown) => caught);
    expect(isApiError(noSlash) && noSlash.fieldErrors.shortcut).toBeTruthy();

    await createReplyTemplate({ title: 'A', category: 'other', body: 'x', shortcut: '/a' });
    const taken = await createReplyTemplate({
      title: 'B',
      category: 'other',
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
