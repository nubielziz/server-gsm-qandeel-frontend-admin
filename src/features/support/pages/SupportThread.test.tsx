// Tests for the open thread, run through the whole app against the dev mock API (the live stream is the dev stand-in): how messages and notes look, who wrote and the
// order, sending a reply and a note (and the server's refusal shown in the composer), reply templates, priority, assignee, Resolve and
// Reopen, the channel choice, the order buttons, and what a missing permission disables.
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { getSupportTicket } from '../api';
import { toDetail, toTicket } from '../mocks/dto';
import { supportState } from '../mocks/store';
import {
  assigneeBox,
  colleagueReply,
  composerBox,
  conversation,
  customerWrites,
  liveMessage,
  messageFrame,
  openSupport,
  optionTexts,
  pdf,
  priorityBox,
  push,
  recordRequests,
  rowFrame,
  setAttention,
  streamOpen,
  templateBox,
  threadTitle,
  ticketRow,
  useMockStream,
} from '../test/supportPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

// Tickets of the mock seed (the demo's).
const LATE_HIGH = 4202; // Victor Silva, SF-20471 (completed), assigned to Lina S., 2h target passed
const NEW_DELAY = 4201; // Jessica Moore, SF-20487 (processing), new, nobody assigned
const TELEGRAM = 4207; // Marco Ricci, came in on Telegram
const MERCHANT = 4213; // Cairo GSM Lab, a merchant, no order
const NOTE_TICKET = 4212; // Jack Turner, has an internal note
const RESOLVED = 4209; // Kevin Doyle, rated 4 / 5
const WAITING = 4206; // Victor Silva, pending: the team wrote last (sent, not seen)

/** Records the JSON bodies a route gets, then lets the mock answer. */
function recorded(method: 'post' | 'patch', pattern: string): unknown[] {
  const bodies: unknown[] = [];
  mockServer.use(
    http[method](pattern, async ({ request }) => {
      bodies.push(await request.clone().json());
      return undefined;
    }),
  );
  return bodies;
}

describe('the conversation', () => {
  it('puts the customer’s words on the left, the team’s reply on the right and a note in a dashed block', async () => {
    await openSupport(`/support?ticket=${NOTE_TICKET}`);
    const log = await conversation();
    expect(log.getByText(/My bank told me to contact you first/)).toBeInTheDocument();
    const note = log.getByText(/Customer matches the lost dispute/);
    expect(note.closest('div')).toHaveClass('border-dashed');
    expect(log.getByText(/Internal note · Rami K\./)).toBeInTheDocument();
    expect(log.getByText(/^Jack · /)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(await screen.findByText('Phone still locked after unlock (SF-20471)'));
    const second = await conversation();
    const reply = await second.findByText(/Hi, thanks for telling us/);
    expect(reply.closest('.justify-end')).not.toBeNull();
  });

  it('says how it arrived, its category, and how long the customer has waited against the target', async () => {
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    await threadTitle('Phone still locked after unlock (SF-20471)');
    expect(screen.getByText(/Contact form · Unlock failed · opened/)).toBeInTheDocument();
    expect(
      screen.getByText(/^Waiting .* for a reply\. The target for high priority is 2h\.$/),
    ).toBeInTheDocument();
  });

  it('has no waiting line for a ticket that is not late', async () => {
    await openSupport(`/support?ticket=${MERCHANT}`);
    await threadTitle('Deposit PAY-1037 not showing in the wallet');
    expect(screen.queryByText(/for a reply\./)).not.toBeInTheDocument();
  });
});

describe('who wrote and the order', () => {
  it('links the customer’s page, masks the email, and shows the order with its status, service and price', async () => {
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    const link = await screen.findByRole('link', { name: 'Victor Silva' });
    expect(link).toHaveAttribute('href', '/customers/28');
    expect(screen.getByText('Customer')).toBeInTheDocument();
    const order = await screen.findByRole('link', { name: 'SF-20471' });
    expect(order).toHaveAttribute('href', '/orders?order=20471');
    const block = order.closest('div') as HTMLElement;
    expect(within(block).getByText('Completed')).toBeInTheDocument();
    expect(block.textContent).toMatch(/\$\d/);
  });

  it('links a merchant’s page and says when no order is linked', async () => {
    await openSupport(`/support?ticket=${MERCHANT}`);
    const link = await screen.findByRole('link', { name: 'Cairo GSM Lab' });
    expect(link).toHaveAttribute('href', '/merchants/5');
    expect(screen.getByText('Merchant', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('Not linked to an order')).toBeInTheDocument();
  });

  it('opens the order’s drawer on the same page from the order link', async () => {
    const user = userEvent.setup();
    const app = await openSupport(`/support?ticket=${LATE_HIGH}`);
    await user.click(await screen.findByRole('link', { name: 'SF-20471' }));
    expect(app.location()).toBe('/support?ticket=4202&order=20471');
    expect(await screen.findByRole('dialog', { name: 'SF-20471' })).toBeInTheDocument();
  });

  it('offers Refund order… for a completed storefront order, and Cancel and refund… for an open one', async () => {
    const user = userEvent.setup();
    const app = await openSupport(`/support?ticket=${LATE_HIGH}`);
    await user.click(await screen.findByRole('button', { name: 'Refund order…' }));
    expect(app.location()).toContain('order=20471');
    expect(screen.queryByRole('button', { name: 'Cancel and refund…' })).not.toBeInTheDocument();
  });

  it('offers Cancel and refund… for an open storefront order, and neither for a merchant', async () => {
    await openSupport(`/support?ticket=${NEW_DELAY}`);
    expect(await screen.findByRole('button', { name: 'Cancel and refund…' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refund order…' })).not.toBeInTheDocument();
  });

  it('offers no order buttons when the ticket has no order', async () => {
    await openSupport(`/support?ticket=${MERCHANT}`);
    await composerBox();
    expect(
      screen.queryByRole('button', { name: /^(Refund order|Cancel and refund)/ }),
    ).not.toBeInTheDocument();
  });
});

describe('replying', () => {
  it('sends the reply, adds it to the thread, moves the ticket to Waiting on customer and clears the box', async () => {
    const user = userEvent.setup();
    const bodies = recorded('post', '*/admin/support-tickets/:id/reply');
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    const box = await composerBox();
    await user.type(box, 'Thanks, we are on it.');
    await user.click(screen.getByRole('button', { name: 'Send reply' }));

    expect(await screen.findByText('Reply sent')).toBeInTheDocument();
    expect(await screen.findByText('Status is now Waiting on customer.')).toBeInTheDocument();
    expect(bodies).toEqual([{ body: 'Thanks, we are on it.' }]);
    const log = await conversation();
    await waitFor(() => expect(log.getByText('Thanks, we are on it.')).toBeInTheDocument());
    expect(box).toHaveValue('');
    const row = await ticketRow('Phone still locked after unlock (SF-20471)');
    await waitFor(() => expect(row.getByText('Waiting on customer')).toBeInTheDocument());
    expect(row.queryByText(/Reply overdue/)).not.toBeInTheDocument();
  });

  it('asks for something to send when the box is empty', async () => {
    const user = userEvent.setup();
    const bodies = recorded('post', '*/admin/support-tickets/:id/reply');
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    await composerBox();
    await user.click(screen.getByRole('button', { name: 'Send reply' }));
    expect(await screen.findByText('Write something first')).toBeInTheDocument();
    expect(screen.getByText('An empty reply isn’t sent.')).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it('shows the server’s refusal under the box and keeps the draft', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/support-tickets/:id/reply', () =>
        problem(409, 'TICKET_RESOLVED', 'Ticket is resolved', 'Someone resolved this ticket a minute ago.'),
      ),
    );
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    const box = await composerBox();
    await user.type(box, 'Hello');
    await user.click(screen.getByRole('button', { name: 'Send reply' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Someone resolved this ticket a minute ago.');
    expect(box).toHaveValue('Hello');
    expect(box).toHaveAttribute('aria-invalid', 'true');
    // Typing again clears the message.
    await user.type(box, '!');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the message the server gives for the text field', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/support-tickets/:id/reply', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'body', message: 'The reply is too long (limit 5000 characters).' },
        ]),
      ),
    );
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    await user.type(await composerBox(), 'Hello');
    await user.click(screen.getByRole('button', { name: 'Send reply' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The reply is too long (limit 5000 characters).',
    );
  });

  it('keeps each ticket’s draft while another ticket is open', async () => {
    const user = userEvent.setup();
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    await user.type(await composerBox(), 'Half a sentence');
    await user.click((await ticketRow('Chargeback warning from my bank')).getByText('Jack Turner'));
    await threadTitle('Chargeback warning from my bank');
    expect(await composerBox()).toHaveValue('');
    await user.click(
      (await ticketRow('Phone still locked after unlock (SF-20471)')).getByText('Victor Silva'),
    );
    await threadTitle('Phone still locked after unlock (SF-20471)');
    expect(await composerBox()).toHaveValue('Half a sentence');
  });

  it('lets a ticket from Telegram be answered on Telegram', async () => {
    const user = userEvent.setup();
    const bodies = recorded('post', '*/admin/support-tickets/:id/reply');
    await openSupport(`/support?ticket=${TELEGRAM}`);
    await user.type(await composerBox(), 'Your result is ready.');
    const channel = screen.getByRole('combobox', { name: 'Send by' });
    expect(optionTexts(channel)).toEqual(['Email', 'Telegram']);
    expect(channel).toHaveValue('telegram');
    expect(screen.getByText('Sent by telegram.')).toBeInTheDocument();
    await user.selectOptions(channel, 'email');
    await user.click(screen.getByRole('button', { name: 'Send reply' }));
    await screen.findByText('Reply sent');
    expect(bodies).toEqual([{ body: 'Your result is ready.', channel: 'email' }]);
  });

  it('offers no channel choice when only email is possible', async () => {
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    await composerBox();
    expect(screen.queryByRole('combobox', { name: 'Send by' })).not.toBeInTheDocument();
    expect(screen.getByText('Sent by email.')).toBeInTheDocument();
  });
});

describe('internal notes', () => {
  it('turns the box amber, sends a note the customer does not see, and leaves the status alone', async () => {
    const user = userEvent.setup();
    const bodies = recorded('post', '*/admin/support-tickets/:id/note');
    await openSupport(`/support?ticket=${NEW_DELAY}`);
    await composerBox();
    await user.click(screen.getByRole('checkbox', { name: 'Internal note, customer won’t see it' }));
    const box = await composerBox('Internal note');
    expect(box).toHaveClass('!bg-warn-bg');
    expect(box).toHaveAttribute('placeholder', 'Write a note for your team');
    expect(screen.getByText('Only your team sees notes.')).toBeInTheDocument();
    await user.type(box, 'Supplier says tomorrow.');
    await user.click(screen.getByRole('button', { name: 'Add note' }));

    expect(await screen.findByText('Note added')).toBeInTheDocument();
    expect(bodies).toEqual([{ body: 'Supplier says tomorrow.' }]);
    const log = await conversation();
    await waitFor(() => expect(log.getByText('Supplier says tomorrow.')).toBeInTheDocument());
    const row = await ticketRow('Order SF-20487 is taking longer than expected');
    expect(row.getByText('New')).toBeInTheDocument();
  });

  it('shows the server’s refusal of a note under the box', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/support-tickets/:id/note', () =>
        problem(403, 'FORBIDDEN', 'Not allowed', 'You cannot add notes to this ticket.'),
      ),
    );
    await openSupport(`/support?ticket=${NEW_DELAY}`);
    await composerBox();
    await user.click(screen.getByRole('checkbox', { name: 'Internal note, customer won’t see it' }));
    await user.type(await composerBox('Internal note'), 'x');
    await user.click(screen.getByRole('button', { name: 'Add note' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('You cannot add notes to this ticket.');
  });

  it('keeps the note switch on when another ticket opens', async () => {
    const user = userEvent.setup();
    await openSupport(`/support?ticket=${NEW_DELAY}`);
    await composerBox();
    await user.click(screen.getByRole('checkbox', { name: 'Internal note, customer won’t see it' }));
    await user.click((await ticketRow('Chargeback warning from my bank')).getByText('Jack Turner'));
    await threadTitle('Chargeback warning from my bank');
    expect(await composerBox('Internal note')).toBeInTheDocument();
  });
});

describe('reply templates', () => {
  it('offers the templates of the ticket’s category and the how-to ones', async () => {
    await openSupport(`/support?ticket=${NEW_DELAY}`);
    const picker = await templateBox();
    await waitFor(() =>
      expect(optionTexts(picker)).toEqual([
        'Insert a reply template…',
        'How to enter the unlock code',
        'Order is in progress',
      ]),
    );
  });

  it('fills the customer’s first name, the order number and the service’s usual time', async () => {
    const user = userEvent.setup();
    await openSupport(`/support?ticket=${NEW_DELAY}`);
    const picker = await templateBox();
    await screen.findByRole('link', { name: 'SF-20487' });
    await waitFor(() => expect(optionTexts(picker)).toContain('Order is in progress'));
    await user.selectOptions(picker, 'Order is in progress');
    const box = (await composerBox()) as HTMLTextAreaElement;
    expect(box.value).toMatch(
      /^Hi Jessica, thanks for your patience\. Your order SF-20487 is with the carrier and the usual time for this service is \d+[dhm]/,
    );
    expect(box.value).not.toContain('{{');
    // The picker goes back to its prompt, so the same template can be picked again.
    expect(picker).toHaveValue('');
  });

  it('uses plain words when the ticket has no order', async () => {
    const user = userEvent.setup();
    await openSupport(`/support?ticket=${MERCHANT}`);
    const picker = await templateBox();
    await waitFor(() => expect(optionTexts(picker)).toContain('Invoice request'));
    await user.selectOptions(picker, 'Invoice request');
    const box = (await composerBox()) as HTMLTextAreaElement;
    expect(box.value).toContain('Hi Cairo, your receipt for your order is attached.');
  });

  it('leaves a variable it does not know visible', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/reply-templates', () =>
        HttpResponse.json(
          [
            {
              id: 99,
              title: 'Odd one',
              category: 'delay',
              locale: 'en',
              body: 'Hi {{name}}, your code is {{code}}. Order {{ order }}.',
              shortcut: '',
              createdBy: 1,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          { headers: { 'x-total-count': '1', 'access-control-expose-headers': 'x-total-count' } },
        ),
      ),
    );
    await openSupport(`/support?ticket=${NEW_DELAY}`);
    const picker = await templateBox();
    await waitFor(() => expect(optionTexts(picker)).toContain('Odd one'));
    await screen.findByRole('link', { name: 'SF-20487' });
    await user.selectOptions(picker, 'Odd one');
    expect(await composerBox()).toHaveValue('Hi Jessica, your code is {{code}}. Order SF-20487.');
  });
});

describe('priority, assignee and status', () => {
  it('changes the priority and shows it in the list', async () => {
    const user = userEvent.setup();
    const bodies = recorded('patch', '*/admin/support-tickets/:id');
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    const select = await priorityBox();
    expect(select).toHaveValue('high');
    expect(optionTexts(select)).toEqual(['High priority', 'Normal priority', 'Low priority']);
    const row = await ticketRow('Phone still locked after unlock (SF-20471)');
    expect(row.getByText('High')).toBeInTheDocument();
    await user.selectOptions(select, 'low');
    await waitFor(() => expect(bodies).toEqual([{ priority: 'low' }]));
    await waitFor(async () =>
      expect(
        (await ticketRow('Phone still locked after unlock (SF-20471)')).queryByText('High'),
      ).not.toBeInTheDocument(),
    );
    expect(await priorityBox()).toHaveValue('low');
  });

  it('assigns the ticket to a person of the staff list, and back to nobody', async () => {
    const user = userEvent.setup();
    const bodies = recorded('patch', '*/admin/support-tickets/:id');
    await openSupport(`/support?ticket=${NEW_DELAY}`);
    const select = await assigneeBox();
    await waitFor(() => expect(optionTexts(select)).toContain('Omar T.'));
    expect(optionTexts(select)).toContain('Rami K. (you)');
    expect(select).toHaveValue('');
    await user.selectOptions(select, 'Omar T.');
    await waitFor(() => expect(bodies).toEqual([{ assigneeId: 3 }]));
    await waitFor(() => expect(select).toHaveValue('3'));
    await user.selectOptions(select, 'Unassigned');
    await waitFor(() => expect(bodies).toEqual([{ assigneeId: 3 }, { assigneeId: null }]));
    await waitFor(() => expect(select).toHaveValue(''));
  });

  it('resolves the ticket: toast, the note in the thread, and the composer gives way to the resolved notice', async () => {
    const user = userEvent.setup();
    const bodies = recorded('patch', '*/admin/support-tickets/:id');
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    await composerBox();
    await user.click(screen.getByRole('button', { name: 'Resolve' }));
    expect(await screen.findByText('Ticket resolved')).toBeInTheDocument();
    expect(bodies).toEqual([{ status: 'resolved' }]);
    expect(
      await screen.findByText(
        /This ticket is resolved, the satisfaction survey is out\. Reopen it to reply\./,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Reply' })).not.toBeInTheDocument();
    const log = await conversation();
    expect(log.getByText(/Marked resolved by Rami K\./)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Reopen' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument();
  });

  it('reopens a resolved ticket and gives the composer back; the notice shows the rating', async () => {
    const user = userEvent.setup();
    const bodies = recorded('patch', '*/admin/support-tickets/:id');
    await openSupport(`/support?ticket=${RESOLVED}`);
    expect(await screen.findByText(/the customer rated it/)).toHaveTextContent('4 / 5');
    await user.click(screen.getByRole('button', { name: 'Reopen' }));
    expect(await composerBox()).toBeInTheDocument();
    expect(bodies).toEqual([{ status: 'open' }]);
    expect(screen.getByRole('button', { name: 'Resolve' })).toBeInTheDocument();
  });

  it('shows the server’s refusal of a change and puts the control back', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/support-tickets/:id', () =>
        problem(409, 'TICKET_LOCKED', 'Ticket is locked', 'Another agent is changing this ticket.'),
      ),
    );
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    const select = await priorityBox();
    await user.selectOptions(select, 'low');
    expect(await screen.findByText(/Another agent is changing this ticket\./)).toBeInTheDocument();
    await waitFor(() => expect(select).toHaveValue('high'));
  });
});

describe('permissions', () => {
  it('lets a reader read but not answer, and says which permission is missing', async () => {
    await openSupport(`/support?ticket=${LATE_HIGH}`, { permissions: ['support:read', 'orders:read'] });
    const box = await composerBox();
    expect(box).toBeDisabled();
    const send = screen.getByRole('button', { name: 'Send reply' });
    expect(send).toBeDisabled();
    expect(send).toHaveAttribute('title', 'You need the support:reply permission');
    expect(screen.getByRole('checkbox', { name: 'Internal note, customer won’t see it' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Reply templates' })).toBeDisabled();
    expect(await priorityBox()).toBeDisabled();
    expect(await assigneeBox()).toHaveAttribute('title', 'You need the support:update permission');
    expect(screen.getByRole('button', { name: 'Resolve' })).toBeDisabled();
  });

  it('lets someone with support:reply answer but not change the ticket', async () => {
    await openSupport(`/support?ticket=${LATE_HIGH}`, { permissions: ['support:read', 'support:reply'] });
    expect(await composerBox()).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Send reply' })).toBeEnabled();
    expect(await priorityBox()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Resolve' })).toBeDisabled();
  });

  it('offers only yourself and the current assignee without staff:read', async () => {
    await openSupport(`/support?ticket=${LATE_HIGH}`, {
      permissions: ['support:read', 'support:update', 'orders:read'],
    });
    const select = await assigneeBox();
    await screen.findByRole('link', { name: 'SF-20471' });
    expect(optionTexts(select)).toEqual(['Unassigned', 'Rami K. (you)', 'Lina S.']);
    expect(select).toHaveValue('2');
  });

  it('shows the order number alone without orders:read', async () => {
    mockServer.use(
      http.get('*/admin/orders/:id', () =>
        problem(403, 'FORBIDDEN', 'No permission', 'You need orders:read.'),
      ),
    );
    await openSupport(`/support?ticket=${LATE_HIGH}`, { permissions: ['support:read'] });
    expect(await screen.findByRole('link', { name: 'Order #20471' })).toHaveAttribute(
      'href',
      '/orders?order=20471',
    );
    expect(screen.queryByRole('button', { name: 'Refund order…' })).not.toBeInTheDocument();
  });
});

/** The GET requests that read one ticket's thread. */
const threadReads = (sent: ReturnType<typeof recordRequests>, id: number) =>
  sent.filter(
    (request) => request.method === 'GET' && request.url.pathname === `/admin/support-tickets/${id}`,
  );
const settle = (ms = 150) => act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

/**
 * Holds the first read of a ticket's thread: the answer is the thread as it is when the request arrives, and it is sent only when `release()` is called.
 * What changes in between is therefore missing from that answer, the way a read that started before a commit misses it. `reached` settles once the
 * request has been taken in; later reads are answered by the mock as usual.
 */
function holdFirstRead(ticketId: number): { reached: Promise<void>; release: () => void } {
  let release!: () => void;
  let reached!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const taken = new Promise<void>((resolve) => (reached = resolve));
  mockServer.use(
    http.get(
      `*/admin/support-tickets/${ticketId}`,
      async () => {
        const row = (await supportState()).tickets.find(ticketId);
        const older = JSON.stringify(toDetail(row!));
        reached();
        await gate;
        return new HttpResponse(older, { headers: { 'content-type': 'application/json' } });
      },
      { once: true },
    ),
  );
  return { reached: taken, release };
}

describe('the live thread', () => {
  useMockStream();

  it('adds a pushed message to the open thread without asking the server', async () => {
    const sent = recordRequests('/admin/support-tickets');
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    const log = await conversation();
    await streamOpen();
    await settle();
    const before = threadReads(sent, LATE_HIGH).length;
    push(
      'ticket.message.created',
      messageFrame(liveMessage(LATE_HIGH, 9001, { body: 'Are you still there?' })),
      't9001',
    );
    expect(await log.findByText('Are you still there?')).toBeInTheDocument();
    await settle();
    expect(threadReads(sent, LATE_HIGH)).toHaveLength(before);
  });

  it('shows the internal note of a colleague at once', async () => {
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    const log = await conversation();
    await streamOpen();
    push(
      'ticket.message.created',
      messageFrame(colleagueReply(LATE_HIGH, 9002, { isInternal: true, body: 'Supplier confirmed.' })),
    );
    expect(await log.findByText('Supplier confirmed.')).toBeInTheDocument();
    expect(log.getByText(/Internal note · Lina S\./)).toBeInTheDocument();
  });

  it('adds one message once however often it arrives, and keeps the thread in id order', async () => {
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    const log = await conversation();
    await streamOpen();
    const later = messageFrame(liveMessage(LATE_HIGH, 9011, { body: 'Second by id' }));
    const earlier = messageFrame(liveMessage(LATE_HIGH, 9010, { body: 'First by id' }));
    push('ticket.message.created', later, 't9011');
    push('ticket.message.created', earlier, 't9010');
    push('ticket.message.created', later, 't9011');
    expect(await log.findByText('First by id')).toBeInTheDocument();
    expect(log.getAllByText('Second by id')).toHaveLength(1);
    const text = screen.getByRole('log', { name: 'Conversation' }).textContent ?? '';
    expect(text.indexOf('First by id')).toBeGreaterThan(text.indexOf('Hi, thanks for telling us'));
    expect(text.indexOf('First by id')).toBeLessThan(text.indexOf('Second by id'));
  });

  it('adds nothing for a message of another ticket', async () => {
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    const log = await conversation();
    await streamOpen();
    push('ticket.message.created', messageFrame(liveMessage(NEW_DELAY, 9020, { body: 'Elsewhere' })));
    push('ticket.message.created', messageFrame(liveMessage(LATE_HIGH, 9021, { body: 'Here' })));
    expect(await log.findByText('Here')).toBeInTheDocument();
    expect(log.queryByText('Elsewhere')).not.toBeInTheDocument();
  });

  it('takes the ticket row of a ticket.updated into the thread', async () => {
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    const select = await priorityBox();
    await streamOpen();
    const ticket = await getSupportTicket(LATE_HIGH);
    push(
      'ticket.updated',
      rowFrame(ticket, { priority: 'low', updatedAt: new Date(Date.now() + 1000).toISOString() }),
    );
    await waitFor(() => expect(select).toHaveValue('low'));
  });

  it('shows a message that arrives while the first read of the thread is still on its way', async () => {
    const hold = holdFirstRead(LATE_HIGH);
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    await hold.reached;
    await streamOpen();
    // The requester writes after the read has looked at the database and before its answer is back: nothing is cached yet to patch.
    await customerWrites(LATE_HIGH, 'Written while you were loading');
    hold.release();
    const log = await conversation();
    expect(await log.findByText('Written while you were loading')).toBeInTheDocument();
  });

  it('shows a change of the ticket that arrives while the first read of the thread is still on its way', async () => {
    const hold = holdFirstRead(LATE_HIGH);
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    await hold.reached;
    await streamOpen();
    const state = await supportState();
    const row = state.tickets.find(LATE_HIGH)!;
    row.priority = 'low';
    row.updatedAt = new Date(Date.now() + 1000).toISOString();
    push('ticket.updated', { ticket: toTicket(row) });
    hold.release();
    const select = await priorityBox();
    await waitFor(() => expect(select).toHaveValue('low'));
  });

  it('reads the thread again after a resync, once however many arrive', async () => {
    const sent = recordRequests('/admin/support-tickets');
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    await conversation();
    await streamOpen();
    await settle();
    const before = threadReads(sent, LATE_HIGH).length;
    for (let i = 0; i < 5; i += 1) push('resync', { topics: ['ticket'] });
    await waitFor(() => expect(threadReads(sent, LATE_HIGH).length).toBe(before + 1));
    await settle(300);
    // The first read goes at once; the rest of the burst is one more read at the end of the 5 second window, not five.
    expect(threadReads(sent, LATE_HIGH).length).toBeLessThanOrEqual(before + 1);
  });

  it('polls every 5 minutes while the stream is open instead of every 30 seconds', async () => {
    vi.useFakeTimers({
      toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'],
      shouldAdvanceTime: true,
    });
    const sent = recordRequests('/admin/support-tickets');
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    await conversation();
    await streamOpen();
    const before = threadReads(sent, LATE_HIGH).length;
    await act(() => vi.advanceTimersByTimeAsync(31_000));
    expect(threadReads(sent, LATE_HIGH)).toHaveLength(before);
    await act(() => vi.advanceTimersByTimeAsync(270_000));
    await waitFor(() => expect(threadReads(sent, LATE_HIGH).length).toBeGreaterThan(before));
  });
});

describe('who is typing', () => {
  useMockStream();
  const typing = (ticketId: number, change: Record<string, unknown> = {}) => ({
    ticketId,
    by: 'requester',
    staffId: null,
    staffName: null,
    mode: null,
    ...change,
  });

  it('shows the requester typing for 6 seconds after the last event, and a pencil on the row', async () => {
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    await conversation();
    await streamOpen();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    push('ticket.typing', typing(LATE_HIGH));
    expect(screen.getByText('Victor Silva is typing…')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Typing' })).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(5_000));
    // A second event restarts the clock: 5 + 5.9 seconds after the first is still inside 6 seconds after the second.
    push('ticket.typing', typing(LATE_HIGH));
    act(() => void vi.advanceTimersByTime(5_900));
    expect(screen.getByText('Victor Silva is typing…')).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(200));
    expect(screen.queryByText('Victor Silva is typing…')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Typing' })).not.toBeInTheDocument();
  });

  it('ends the line at once when that person’s message arrives', async () => {
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    const log = await conversation();
    await streamOpen();
    push('ticket.typing', typing(LATE_HIGH));
    expect(screen.getByText('Victor Silva is typing…')).toBeInTheDocument();
    push(
      'ticket.message.created',
      messageFrame(liveMessage(LATE_HIGH, 9030, { body: 'Sorry, one more thing' })),
    );
    expect(await log.findByText('Sorry, one more thing')).toBeInTheDocument();
    expect(screen.queryByText('Victor Silva is typing…')).not.toBeInTheDocument();
  });

  it('shows a colleague replying or writing a note, never oneself, and nothing for another ticket', async () => {
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    await conversation();
    await streamOpen();
    push(
      'ticket.typing',
      typing(LATE_HIGH, { by: 'staff', staffId: 2, staffName: 'Lina S.', mode: 'reply' }),
    );
    expect(screen.getByText('Lina S. is replying…')).toBeInTheDocument();
    push('ticket.typing', typing(LATE_HIGH, { by: 'staff', staffId: 2, staffName: 'Lina S.', mode: 'note' }));
    expect(screen.getByText('Lina S. is writing a note…')).toBeInTheDocument();
    expect(screen.queryByText('Lina S. is replying…')).not.toBeInTheDocument();
    // Rami (staff id 1) is the signed-in staff member: another tab of his own never shows.
    push(
      'ticket.typing',
      typing(LATE_HIGH, { by: 'staff', staffId: 1, staffName: 'Rami K.', mode: 'reply' }),
    );
    expect(screen.queryByText('Rami K. is replying…')).not.toBeInTheDocument();
    push(
      'ticket.typing',
      typing(NEW_DELAY, { by: 'staff', staffId: 3, staffName: 'Omar H.', mode: 'reply' }),
    );
    expect(screen.queryByText(/Omar H\. is/)).not.toBeInTheDocument();
  });

  it('tells the server at most once every 3 seconds while the draft changes, and never for an empty draft', async () => {
    const user = userEvent.setup();
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    const box = await composerBox();
    const pings = recordRequests(`/admin/support-tickets/${LATE_HIGH}/typing`);
    // The page's clock is moved by hand from here: only the throttle reads it.
    let clock = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => clock);
    await user.type(box, 'abc');
    await waitFor(() => expect(pings).toHaveLength(1));
    expect(pings[0].method).toBe('POST');
    await waitFor(() => expect(pings[0].body).toEqual({ mode: 'reply' }));
    // More typing inside the 3 seconds sends nothing; after them the next change sends again.
    clock += 2_900;
    await user.type(box, 'd');
    await settle();
    expect(pings).toHaveLength(1);
    clock += 200;
    await user.type(box, 'e');
    await waitFor(() => expect(pings).toHaveLength(2));
    // Clearing the box sends nothing.
    clock += 10_000;
    await user.clear(box);
    await settle();
    expect(pings).toHaveLength(2);
    // A note says so.
    await user.click(screen.getByRole('checkbox', { name: 'Internal note, customer won’t see it' }));
    await user.type(await composerBox('Internal note'), 'n');
    await waitFor(() => expect(pings).toHaveLength(3));
    await waitFor(() => expect(pings[2].body).toEqual({ mode: 'note' }));
  });

  it('sends no typing signal for a draft that was already there, or without support:reply', async () => {
    const user = userEvent.setup();
    await openSupport(`/support?ticket=${LATE_HIGH}`, { permissions: ['support:read'] });
    const pings = recordRequests('/typing');
    const box = await composerBox();
    expect(box).toBeDisabled();
    await user.type(box, 'abc');
    await settle();
    expect(pings).toHaveLength(0);
  });
});

describe('Sent and Seen', () => {
  useMockStream();

  it('says Sent under the team’s last public reply until the requester has seen it, then Seen with the time', async () => {
    await openSupport(`/support?ticket=${WAITING}`);
    const log = await conversation();
    await streamOpen();
    expect(await log.findByText('Sent')).toBeInTheDocument();
    const ticket = await getSupportTicket(WAITING);
    const reply = ticket.messages.findLast((message) => message.authorType === 'staff');
    push('ticket.read', {
      ticketId: WAITING,
      by: 'requester',
      upToMessageId: reply?.id,
      at: new Date().toISOString(),
    });
    expect(await log.findByText(/^Seen \d/)).toBeInTheDocument();
    expect(log.queryByText('Sent')).not.toBeInTheDocument();
  });

  it('never moves a seen mark back, and ignores a mark of another ticket', async () => {
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    const log = await conversation();
    await streamOpen();
    expect(await log.findByText(/^Seen /)).toBeInTheDocument();
    push('ticket.read', {
      ticketId: LATE_HIGH,
      by: 'requester',
      upToMessageId: 1,
      at: new Date().toISOString(),
    });
    push('ticket.read', {
      ticketId: WAITING,
      by: 'requester',
      upToMessageId: 999,
      at: new Date().toISOString(),
    });
    await settle();
    expect(log.getByText(/^Seen /)).toBeInTheDocument();
  });

  it('puts the line under the last public reply only: a note after it has none', async () => {
    await openSupport(`/support?ticket=${WAITING}`);
    const log = await conversation();
    await streamOpen();
    push(
      'ticket.message.created',
      messageFrame(colleagueReply(WAITING, 9040, { isInternal: true, body: 'Checking with the bank.' })),
    );
    await log.findByText('Checking with the bank.');
    expect(log.getAllByText('Sent')).toHaveLength(1);
    // It sits right under the team's reply (the bubble before it), not under the note that came after.
    expect(log.getByText('Sent').previousElementSibling?.textContent).toMatch(/We see one cap/);
  });
});

describe('telling the server the team has seen it', () => {
  useMockStream();
  const reads = () => recordRequests(`/admin/support-tickets/${LATE_HIGH}/read`);

  it('marks the newest requester message seen once, when the thread is visible and focused', async () => {
    setAttention(true);
    const sent = reads();
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    await conversation();
    await streamOpen();
    await waitFor(() => expect(sent).toHaveLength(1));
    await waitFor(() => expect(sent[0].body).toEqual({ upToMessageId: 3 }));
    // A refetch of the thread, a repeat of the same event and a re-render send nothing more.
    const again = messageFrame(await customerWrites(LATE_HIGH, 'Hello?'));
    await waitFor(() => expect(sent).toHaveLength(2));
    push('ticket.message.created', again);
    push('ticket.updated', rowFrame(await getSupportTicket(LATE_HIGH)));
    await settle(300);
    expect(sent).toHaveLength(2);
    expect(sent[1].body).toEqual({ upToMessageId: again.message.id });
  });

  it('does nothing while the tab is hidden or has lost focus, and sends one mark when the staff member is back', async () => {
    setAttention(false);
    const sent = reads();
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    await conversation();
    await streamOpen();
    await customerWrites(LATE_HIGH, 'Anyone there?');
    await settle(300);
    expect(sent).toHaveLength(0);
    setAttention(true, false);
    await settle();
    expect(sent).toHaveLength(0);
    setAttention(true);
    await waitFor(() => expect(sent).toHaveLength(1));
    await waitFor(() => expect(sent[0].body).toMatchObject({ upToMessageId: expect.any(Number) }));
    await settle(300);
    expect(sent).toHaveLength(1);
  });

  it('sends nothing for a ticket whose requester messages the team has already seen', async () => {
    setAttention(true);
    const sent = recordRequests(`/admin/support-tickets/${WAITING}/read`);
    await openSupport(`/support?ticket=${WAITING}`);
    await conversation();
    await streamOpen();
    await settle(300);
    expect(sent).toHaveLength(0);
  });

  it('clears the unread dot of the row once the mark is sent', async () => {
    setAttention(true);
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    await conversation();
    const row = await ticketRow('Phone still locked after unlock (SF-20471)');
    await waitFor(() => expect(row.queryByRole('img', { name: 'Unread message' })).not.toBeInTheDocument());
  });

  it('sends nothing when the thread is not on screen (a phone showing the list)', async () => {
    setAttention(true);
    const sent = reads();
    await openSupport('/support');
    await threadTitle('Phone still locked after unlock (SF-20471)');
    await settle(300);
    expect(sent).toHaveLength(0);
  });
});

describe('a colleague answers while you write', () => {
  useMockStream();
  const warning = 'Lina S. just replied. Check the thread before you send.';

  it('warns for 30 seconds, only while the composer holds a draft', async () => {
    const user = userEvent.setup();
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    const box = await composerBox();
    await streamOpen();
    await user.type(box, 'My answer');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    push('ticket.message.created', messageFrame(colleagueReply(LATE_HIGH, 9050, { body: 'I have this.' })));
    expect(screen.getByText(warning)).toBeInTheDocument();
    expect(screen.getByText(warning).closest('[aria-live="polite"]')).not.toBeNull();
    act(() => void vi.advanceTimersByTime(29_000));
    expect(screen.getByText(warning)).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(1_500));
    expect(screen.queryByText(warning)).not.toBeInTheDocument();
  });

  it('says nothing with an empty box, for one’s own reply, a note, a replayed message or another ticket', async () => {
    const user = userEvent.setup();
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    const box = await composerBox();
    await streamOpen();
    push('ticket.message.created', messageFrame(colleagueReply(LATE_HIGH, 9060)));
    await settle();
    expect(screen.queryByText(warning)).not.toBeInTheDocument();
    await user.type(box, 'Draft');
    push(
      'ticket.message.created',
      messageFrame(colleagueReply(LATE_HIGH, 9061, { authorId: 1, authorName: 'Rami K.' })),
    );
    push('ticket.message.created', messageFrame(colleagueReply(LATE_HIGH, 9062, { isInternal: true })));
    push('ticket.message.created', messageFrame(colleagueReply(LATE_HIGH, 9063), false));
    push('ticket.message.created', messageFrame(colleagueReply(NEW_DELAY, 9064)));
    await settle();
    expect(screen.queryByText(warning)).not.toBeInTheDocument();
  });
});

describe('attachments in the thread', () => {
  useMockStream();

  it('lists the files of a message as links that open in a new tab, with the virus note under a requester’s', async () => {
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    const log = await conversation();
    await streamOpen();
    push(
      'ticket.message.created',
      messageFrame(
        liveMessage(LATE_HIGH, 9070, {
          body: 'Proof of payment',
          attachments: [pdf(5), pdf(6, 'receipt.png')],
        }),
      ),
    );
    const link = await log.findByRole('link', { name: /invoice\.pdf/ });
    expect(link).toHaveAttribute('href', expect.stringMatching(/\/admin\/support-tickets\/4202\/files\/5$/));
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener');
    expect(link).toHaveTextContent('340 KB');
    expect(log.getByRole('link', { name: /receipt\.png/ })).toBeInTheDocument();
    expect(log.getByText('Files are not virus-scanned.')).toBeInTheDocument();
  });

  it('shows a message with files only, and a staff file without the virus note', async () => {
    await openSupport(`/support?ticket=${WAITING}`);
    const log = await conversation();
    await streamOpen();
    push(
      'ticket.message.created',
      messageFrame(colleagueReply(WAITING, 9071, { body: '', attachments: [pdf(7, 'invoice.pdf')] })),
    );
    expect(await log.findByRole('link', { name: /invoice\.pdf/ })).toBeInTheDocument();
    expect(log.queryByText('Files are not virus-scanned.')).not.toBeInTheDocument();
  });
});

describe('attaching files', () => {
  const file = (name: string, type: string, size = 12) => new File([new Uint8Array(size)], name, { type });
  const upload = (names: readonly File[]) =>
    userEvent.setup({ applyAccept: false }).upload(screen.getByLabelText('Attach files'), [...names]);

  it('uploads a picked file at once, shows its chip, and sends the reply with the file id', async () => {
    const uploads = recordRequests(`/admin/support-tickets/${LATE_HIGH}/files`);
    const bodies = recorded('post', '*/admin/support-tickets/:id/reply');
    const user = userEvent.setup();
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    await user.type(await composerBox(), 'Here is the proof.');
    await upload([file('proof.pdf', 'application/pdf')]);
    const chips = within(await screen.findByRole('list', { name: 'Files on this message' }));
    expect(chips.getByText('proof.pdf')).toBeInTheDocument();
    await waitFor(() => expect(chips.queryByText('Uploading…')).not.toBeInTheDocument());
    expect(uploads).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Send reply' }));
    await screen.findByText('Reply sent');
    // File 1 is the receipt of the mock seed (T-4208), so the first upload is file 2.
    expect(bodies).toEqual([{ body: 'Here is the proof.', fileIds: [2] }]);
    // The chips go once the reply is sent, and the reply shows its file.
    await waitFor(() =>
      expect(screen.queryByRole('list', { name: 'Files on this message' })).not.toBeInTheDocument(),
    );
    // The jsdom test environment loses the upload's file name (the mock names it "blob"); a real browser keeps it.
    expect((await conversation()).getAllByRole('link', { name: /blob/ })).toHaveLength(1);
  });

  it('sends a reply made of files only, and a note with a file', async () => {
    const replies = recorded('post', '*/admin/support-tickets/:id/reply');
    const notes = recorded('post', '*/admin/support-tickets/:id/note');
    const user = userEvent.setup();
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    await composerBox();
    await upload([file('a.png', 'image/png')]);
    await waitFor(() => expect(screen.queryByText('Uploading…')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Send reply' }));
    await screen.findByText('Reply sent');
    expect(replies).toEqual([{ body: '', fileIds: [2] }]);

    await user.click(screen.getByRole('checkbox', { name: 'Internal note, customer won’t see it' }));
    await upload([file('b.jpg', 'image/jpeg')]);
    await waitFor(() => expect(screen.queryByText('Uploading…')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Add note' }));
    await screen.findByText('Note added');
    expect(notes).toEqual([{ body: '', fileIds: [3] }]);
  });

  it('removes a chip and sends the reply without it', async () => {
    const bodies = recorded('post', '*/admin/support-tickets/:id/reply');
    const user = userEvent.setup();
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    await user.type(await composerBox(), 'No file after all');
    await upload([file('proof.pdf', 'application/pdf')]);
    const remove = await screen.findByRole('button', { name: 'Remove proof.pdf' });
    await user.click(remove);
    expect(screen.queryByRole('list', { name: 'Files on this message' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Send reply' }));
    await screen.findByText('Reply sent');
    expect(bodies).toEqual([{ body: 'No file after all' }]);
  });

  it('refuses a wrong type, an empty file and a sixth file on the chip, without asking the server', async () => {
    const uploads = recordRequests('/files');
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    await composerBox();
    await upload([file('tool.exe', 'application/x-msdownload'), file('empty.pdf', 'application/pdf', 0)]);
    expect(await screen.findByText('Only PDF, JPEG and PNG files can be attached.')).toBeInTheDocument();
    expect(screen.getByText('This file is empty.')).toBeInTheDocument();
    expect(uploads).toHaveLength(0);
  });

  it('allows five files and refuses the sixth', async () => {
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    await composerBox();
    await upload(Array.from({ length: 6 }, (_, index) => file(`f${index + 1}.pdf`, 'application/pdf')));
    expect(await screen.findByText('A message can have 5 files at most.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Remove f/ })).toHaveLength(6);
  });

  it('shows the server’s own refusal of a file on its chip, and the reply still goes with the good files', async () => {
    mockServer.use(
      http.post('*/admin/support-tickets/:id/files', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'file', message: 'This file is a program, not a PDF.' },
        ]),
      ),
    );
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    await composerBox();
    await upload([file('fake.pdf', 'application/pdf')]);
    expect(await screen.findByText('This file is a program, not a PDF.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send reply' })).toBeEnabled();
  });

  it('keeps Send disabled while a file is uploading, and offers no Attach without support:reply', async () => {
    let finish: () => void = () => {};
    mockServer.use(
      http.post('*/admin/support-tickets/:id/files', async () => {
        await new Promise<void>((resolve) => (finish = resolve));
        return HttpResponse.json(
          {
            id: 77,
            filename: 'slow.pdf',
            size: 12,
            mime: 'application/pdf',
            sha256: '0'.repeat(64),
            createdAt: new Date().toISOString(),
          },
          { status: 201 },
        );
      }),
    );
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    await composerBox();
    await upload([file('slow.pdf', 'application/pdf')]);
    const send = screen.getByRole('button', { name: 'Send reply' });
    await waitFor(() => expect(send).toBeDisabled());
    expect(send).toHaveAttribute('title', 'Wait for the files to finish uploading.');
    finish();
    await waitFor(() => expect(send).toBeEnabled());
  });

  it('disables Attach for a staff member who may not reply', async () => {
    await openSupport(`/support?ticket=${LATE_HIGH}`, { permissions: ['support:read'] });
    await composerBox();
    expect(screen.getByRole('button', { name: 'Attach' })).toBeDisabled();
  });

  it('shows the server’s refusal of the reply’s files under the box and keeps the chips', async () => {
    const user = userEvent.setup();
    await openSupport(`/support?ticket=${LATE_HIGH}`);
    await composerBox();
    await upload([file('a.pdf', 'application/pdf')]);
    await waitFor(() => expect(screen.queryByText('Uploading…')).not.toBeInTheDocument());
    mockServer.use(
      http.post('*/admin/support-tickets/:id/reply', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'fileIds', message: 'One of the files is not available. Attach it again.' },
        ]),
      ),
    );
    await user.click(screen.getByRole('button', { name: 'Send reply' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Some fields need attention.');
    expect(screen.getByRole('button', { name: 'Remove a.pdf' })).toBeInTheDocument();
  });
});

describe('the dev stand-in for the customer', () => {
  useMockStream();

  it('answers a reply that contains /echo: seen, typing, then a message', async () => {
    const user = userEvent.setup();
    await openSupport(`/support?ticket=${WAITING}`);
    const log = await conversation();
    await streamOpen();
    await user.type(await composerBox(), 'Please check /echo');
    await user.click(screen.getByRole('button', { name: 'Send reply' }));
    await screen.findByText('Reply sent');
    await waitFor(() => expect(log.getByText(/^Seen \d/)).toBeInTheDocument(), { timeout: 3_000 });
    await waitFor(() => expect(screen.getByText('Victor Silva is typing…')).toBeInTheDocument(), {
      timeout: 3_000,
    });
    expect(await log.findByText(/One more question/, {}, { timeout: 5_000 })).toBeInTheDocument();
    expect(screen.queryByText('Victor Silva is typing…')).not.toBeInTheDocument();
  });
});
