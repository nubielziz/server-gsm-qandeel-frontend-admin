// Tests for the open thread, run through the whole app against the dev mock API: how messages and notes look, who wrote and the
// order, sending a reply and a note (and the server's refusal shown in the composer), reply templates, priority, assignee, Resolve and
// Reopen, the channel choice, the order buttons, and what a missing permission disables.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import {
  assigneeBox,
  composerBox,
  conversation,
  openSupport,
  optionTexts,
  priorityBox,
  templateBox,
  threadTitle,
  ticketRow,
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
