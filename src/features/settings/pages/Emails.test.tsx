// Tests for the Customer emails tab, run through the whole app against the dev mock API: the templates and their menus, the Send switch
// with the check before a receipt goes off, the server's preview as text and as sandboxed HTML, new, edit and delete, permissions.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { createTemplate, getTemplate, listTemplates } from '../api';
import { signInAs } from '@/test/renderApp';
import { dialogOf, openSettings, rowOf } from '../test/settingsPage';
import { recordRequests } from '../test/requests';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

const EMAILS = '/settings?tab=notifications';
const TABLE = 'Message templates';

describe('the list', () => {
  it('lists the customer emails with who gets them and how many were sent', async () => {
    await openSettings(EMAILS);
    const received = await rowOf(TABLE, 'Order received');
    expect(received.getByText('Customer · Email')).toBeInTheDocument();
    expect(received.getByText('112')).toBeInTheDocument();
    expect(received.getByRole('switch', { name: 'Turn off: Order received' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    const failed = await rowOf(TABLE, 'Payment failed');
    expect(failed.getByRole('switch', { name: 'Turn on: Payment failed' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(screen.getByRole('heading', { name: 'Customer emails' })).toBeInTheDocument();
    expect(screen.getByText('5 templates')).toBeInTheDocument();
  });

  it('switches to the merchant messages and back to all of them, with no channel menu', async () => {
    const user = userEvent.setup();
    const app = await openSettings(EMAILS);
    await screen.findByText('Order received');
    expect(screen.queryByRole('combobox', { name: 'Channel' })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Who receives it' }), 'merchant');
    expect(await screen.findByRole('heading', { name: 'Merchant messages' })).toBeInTheDocument();
    expect(app.location()).toBe('/settings?tab=notifications&audience=merchant');
    expect(await screen.findByText('Wallet low balance')).toBeInTheDocument();
    expect((await rowOf(TABLE, 'Order completed')).getByText('Merchant · Email')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Who receives it' }), 'all');
    expect(await screen.findByRole('heading', { name: 'All messages' })).toBeInTheDocument();
  });

  it('leaves out a template of a retired channel that an older backend still lists', async () => {
    const email = {
      id: 1,
      event: 'order.received',
      channel: 'email',
      audience: 'customer',
      subject: 'Your order is confirmed',
      body: 'Thanks.',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    mockServer.use(
      http.get('*/admin/notification-templates', () =>
        HttpResponse.json([email, { ...email, id: 2, event: 'order.completed', channel: 'telegram' }], {
          headers: { 'x-total-count': '2' },
        }),
      ),
    );
    await openSettings(EMAILS);
    expect(await screen.findByText('Order received')).toBeInTheDocument();
    expect(screen.queryByText('Order completed')).not.toBeInTheDocument();
    expect(screen.getByText('1 template')).toBeInTheDocument();
  });

  it('never shows the staff alert templates of the Telegram channel, whatever audience the menu holds', async () => {
    const user = userEvent.setup();
    const staffEmail = {
      id: 5,
      event: 'staff.invited',
      channel: 'email',
      audience: 'staff',
      subject: 'You were added to the console',
      body: 'Welcome.',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const alert = { ...staffEmail, id: 6, event: 'system.alert', channel: 'telegram', subject: '' };
    mockServer.use(
      http.get('*/admin/notification-templates', () =>
        HttpResponse.json([staffEmail, alert], { headers: { 'x-total-count': '2' } }),
      ),
    );
    await openSettings(`${EMAILS}&audience=staff`);
    expect(await screen.findByText('Staff invited')).toBeInTheDocument();
    expect(screen.queryByText('System alert')).not.toBeInTheDocument();
    expect(screen.getByText('1 template')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Who receives it' }), 'all');
    expect(await screen.findByRole('heading', { name: 'All messages' })).toBeInTheDocument();
    expect(screen.getByText('Staff invited')).toBeInTheDocument();
    expect(screen.queryByText('System alert')).not.toBeInTheDocument();
    expect(screen.getByText('1 template')).toBeInTheDocument();
  });

  it('shows an empty state with a way to add one', async () => {
    mockServer.use(
      http.get('*/admin/notification-templates', () =>
        HttpResponse.json([], { headers: { 'x-total-count': '0' } }),
      ),
    );
    await openSettings(EMAILS);
    expect(await screen.findByText('No messages')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'New template' })).toHaveLength(2);
  });
});

describe('the Send switch', () => {
  it('turns an email off and says so', async () => {
    const user = userEvent.setup();
    await openSettings(EMAILS);
    await user.click(
      (await rowOf(TABLE, 'Support reply')).getByRole('switch', { name: 'Turn off: Support reply' }),
    );
    expect(await screen.findByText('Support reply is off')).toBeInTheDocument();
    expect((await getTemplate(4)).isActive).toBe(false);
  });

  it('asks before the receipt goes off, and leaves it on if the answer is Cancel', async () => {
    const user = userEvent.setup();
    await openSettings(EMAILS);
    await user.click(
      (await rowOf(TABLE, 'Order received')).getByRole('switch', { name: 'Turn off: Order received' }),
    );
    const dialog = dialogOf('Turn off “Order received”?');
    expect(dialog.getByText(/no proof to send when a customer disputes a charge/)).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect((await getTemplate(1)).isActive).toBe(true);
    await user.click(
      (await rowOf(TABLE, 'Order received')).getByRole('switch', { name: 'Turn off: Order received' }),
    );
    await user.click(dialogOf('Turn off “Order received”?').getByRole('button', { name: 'Turn off' }));
    expect(await screen.findByText('Order received is off')).toBeInTheDocument();
    expect((await getTemplate(1)).isActive).toBe(false);
  });

  it('turns an email on without asking, and shows the server’s refusal', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/notification-templates/:id', () =>
        problem(409, 'TEMPLATE_BROKEN', 'Cannot turn it on', 'The template has an unknown mark {{orderNo}}.'),
      ),
    );
    await openSettings(EMAILS);
    await user.click(
      (await rowOf(TABLE, 'Payment failed')).getByRole('switch', { name: 'Turn on: Payment failed' }),
    );
    expect(await screen.findByText('Cannot turn it on')).toBeInTheDocument();
    expect((await rowOf(TABLE, 'Payment failed')).getByRole('switch')).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });
});

describe('Preview', () => {
  it('shows the subject and text the server renders with sample data', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings(EMAILS);
    await user.click(
      (await rowOf(TABLE, 'Order received')).getByRole('button', { name: 'Preview Order received' }),
    );
    const dialog = dialogOf('Order received');
    expect(await dialog.findByText('Your order SF-20431 is confirmed')).toBeInTheDocument();
    expect(dialog.getByText(/We received £14\.39 for "Vodafone UK iPhone Unlock"/)).toBeInTheDocument();
    expect(dialog.getByText(/From IMEI-HUB/)).toBeInTheDocument();
    expect(dialog.getByText('A sample with made-up details.')).toBeInTheDocument();
    expect(dialog.queryByTitle('Message preview')).not.toBeInTheDocument();
    expect(recorder.to('POST', '/admin/notification-templates/1/preview')).toHaveLength(1);
  });

  it('puts HTML from the server in a frame with no scripts, and never into the page', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/notification-templates/:id/preview', () =>
        HttpResponse.json({
          subject: 'Your order',
          body: '<h1>Hello HTML</h1><script>window.__owned = true</script><img src="https://x.example/p.png" onerror="window.__owned = true">',
          format: 'html',
        }),
      ),
    );
    await openSettings(EMAILS);
    await user.click(
      (await rowOf(TABLE, 'Order received')).getByRole('button', { name: 'Preview Order received' }),
    );
    const frame = await dialogOf('Order received').findByTitle('Message preview');
    expect(frame.tagName).toBe('IFRAME');
    // An empty sandbox attribute allows nothing: no scripts, no forms, no same-origin access, no popups.
    expect(frame).toHaveAttribute('sandbox', '');
    expect(frame.getAttribute('srcdoc')).toContain("default-src 'none'");
    expect(frame.getAttribute('srcdoc')).toContain('<h1>Hello HTML</h1>');
    expect(screen.queryByRole('heading', { name: 'Hello HTML' })).not.toBeInTheDocument();
    expect(document.querySelector('dialog script')).toBeNull();
    expect((window as unknown as { __owned?: boolean }).__owned).toBeUndefined();
  });

  it('prints text as text even when it looks like markup', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/notification-templates/:id/preview', () =>
        HttpResponse.json({ subject: 'Hi', body: '<b>not bold</b>', format: 'text' }),
      ),
    );
    await openSettings(EMAILS);
    await user.click(
      (await rowOf(TABLE, 'Order received')).getByRole('button', { name: 'Preview Order received' }),
    );
    expect(await dialogOf('Order received').findByText('<b>not bold</b>')).toBeInTheDocument();
  });

  it('says so, with a Retry, when the preview failed', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/notification-templates/:id/preview', () =>
        problem(422, 'TEMPLATE_INVALID', 'Template has an error', 'The mark {{orderNo}} is unknown.'),
      ),
    );
    await openSettings(EMAILS);
    await user.click(
      (await rowOf(TABLE, 'Order received')).getByRole('button', { name: 'Preview Order received' }),
    );
    const dialog = dialogOf('Order received');
    expect(await dialog.findByText('Could not preview this template')).toBeInTheDocument();
    expect(dialog.getByText('The mark {{orderNo}} is unknown.')).toBeInTheDocument();
    mockServer.resetHandlers();
    await user.click(dialog.getByRole('button', { name: 'Retry' }));
    expect(await dialog.findByText('Your order SF-20431 is confirmed')).toBeInTheDocument();
  });
});

describe('Edit', () => {
  it('changes the subject and sends only that', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings(EMAILS);
    await user.click(
      (await rowOf(TABLE, 'Order received')).getByRole('button', { name: 'Edit Order received' }),
    );
    const dialog = dialogOf('Edit Order received');
    // The event of a saved template is fixed: the menu shows it, in words, and cannot change.
    expect(dialog.getByRole('combobox', { name: 'Event' })).toBeDisabled();
    expect(dialog.getByRole('combobox', { name: 'Event' })).toHaveValue('order.received');
    await user.clear(dialog.getByRole('textbox', { name: 'Subject' }));
    await user.type(dialog.getByRole('textbox', { name: 'Subject' }), 'Thanks for your order');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Order received saved')).toBeInTheDocument();
    expect(recorder.to('PATCH', '/admin/notification-templates/1')[0].body).toEqual({
      subject: 'Thanks for your order',
    });
    expect((await getTemplate(1)).subject).toBe('Thanks for your order');
  });

  it('puts the server’s message under the message box', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/notification-templates/:id', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'body', message: 'The mark {{orderNo}} is unknown.' },
        ]),
      ),
    );
    await openSettings(EMAILS);
    await user.click(
      (await rowOf(TABLE, 'Support reply')).getByRole('button', { name: 'Edit Support reply' }),
    );
    const dialog = dialogOf('Edit Support reply');
    await user.type(dialog.getByRole('textbox', { name: 'Message' }), ' extra');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await dialog.findByText('The mark {{orderNo}} is unknown.')).toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: 'Message' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('says so when nothing changed', async () => {
    const user = userEvent.setup();
    await openSettings(EMAILS);
    await user.click(
      (await rowOf(TABLE, 'Support reply')).getByRole('button', { name: 'Edit Support reply' }),
    );
    await user.click(dialogOf('Edit Support reply').getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
  });
});

describe('New template', () => {
  it('adds an email template, with no channel to choose', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings(EMAILS);
    await user.click(await screen.findByRole('button', { name: 'New template' }));
    const dialog = dialogOf('New template');
    expect(dialog.queryByRole('textbox', { name: 'Event' })).not.toBeInTheDocument();
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Event' }), 'Refund declined');
    expect(dialog.queryByRole('textbox', { name: 'Language' })).not.toBeInTheDocument();
    await user.type(dialog.getByRole('textbox', { name: 'Subject' }), 'Your refund');
    await user.type(dialog.getByRole('textbox', { name: 'Message' }), 'We could not refund your money.');
    expect(dialog.queryByRole('combobox', { name: 'Channel' })).not.toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Create template' }));
    expect(await screen.findByText('Refund declined added')).toBeInTheDocument();
    expect((await rowOf(TABLE, 'Refund declined')).getByText('Customer · Email')).toBeInTheDocument();
    // The key is what the menu holds, sent as before.
    expect(recorder.to('POST', '/admin/notification-templates')[0].body).toEqual({
      event: 'refund.declined',
      channel: 'email',
      audience: 'customer',
      subject: 'Your refund',
      body: 'We could not refund your money.',
      isActive: true,
    });
  });

  it('offers the events of the audience it is sent to, and starts the choice again when the audience changes', async () => {
    const user = userEvent.setup();
    await openSettings(EMAILS);
    await user.click(await screen.findByRole('button', { name: 'New template' }));
    const dialog = dialogOf('New template');
    const event = dialog.getByRole('combobox', { name: 'Event' });
    const words = () =>
      within(event)
        .getAllByRole('option')
        .map((option) => option.textContent);
    expect(words()[0]).toBe('Choose an event…');
    expect(words()).toContain('Support reply');
    expect(words()).toContain('Wallet frozen');
    expect(words()).not.toContain('Wallet low balance');
    await user.selectOptions(event, 'Wallet frozen');
    expect(event).toHaveValue('wallet.frozen');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Sent to' }), 'Merchant');
    expect(event).toHaveValue('');
    expect(words()).toContain('Wallet low balance');
    // A merchant has its own support texts (the reply and the receipt of a ticket), and none of the customer's wallet mails.
    expect(words()).toContain('Support reply');
    expect(words()).toContain('Support ticket received');
    expect(words()).not.toContain('Wallet frozen');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Sent to' }), 'Staff');
    expect(words()).toContain('Alert fired');
    await user.selectOptions(event, 'Alert fired');
    expect(event).toHaveValue('alert.fired');
  });

  it('keeps a saved event the menu does not know chosen and shown in words', async () => {
    const user = userEvent.setup();
    await signInAs();
    await createTemplate({
      event: 'refund.issued',
      channel: 'email',
      audience: 'customer',
      subject: 'Your refund',
      body: 'Refunded.',
      isActive: true,
    });
    await openSettings(EMAILS);
    await user.click(
      (await rowOf(TABLE, 'Refund issued')).getByRole('button', { name: 'Edit Refund issued' }),
    );
    const dialog = dialogOf('Edit Refund issued');
    const event = dialog.getByRole('combobox', { name: 'Event' });
    expect(event).toHaveValue('refund.issued');
    expect(within(event).getByRole('option', { name: 'Refund issued' })).toBeInTheDocument();
  });

  it('shows the server’s message when the same template already exists', async () => {
    const user = userEvent.setup();
    await openSettings(EMAILS);
    await user.click(await screen.findByRole('button', { name: 'New template' }));
    const dialog = dialogOf('New template');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Event' }), 'Order received');
    await user.type(dialog.getByRole('textbox', { name: 'Subject' }), 'Again');
    await user.type(dialog.getByRole('textbox', { name: 'Message' }), 'Again.');
    await user.click(dialog.getByRole('button', { name: 'Create template' }));
    expect(
      await dialog.findByText('A template for this event, channel and audience already exists.'),
    ).toBeInTheDocument();
    expect(dialog.getByRole('combobox', { name: 'Event' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('asks for the event, subject and message first', async () => {
    const user = userEvent.setup();
    await openSettings(EMAILS);
    await user.click(await screen.findByRole('button', { name: 'New template' }));
    await user.click(dialogOf('New template').getByRole('button', { name: 'Create template' }));
    const dialog = dialogOf('New template');
    expect(await dialog.findByText('Choose an event.')).toBeInTheDocument();
    expect(dialog.getByText('An email needs a subject.')).toBeInTheDocument();
    expect(dialog.getByText('Write the message.')).toBeInTheDocument();
  });
});

describe('Delete', () => {
  it('deletes a template after a review step', async () => {
    const user = userEvent.setup();
    await openSettings(EMAILS);
    await user.click(
      (await rowOf(TABLE, 'Payment failed')).getByRole('button', { name: 'Delete Payment failed' }),
    );
    await user.click(dialogOf('Delete “Payment failed”?').getByRole('button', { name: 'Delete template' }));
    expect(await screen.findByText('Payment failed deleted')).toBeInTheDocument();
    expect((await listTemplates()).data.some((template) => template.event === 'payment.failed')).toBe(false);
  });
});

describe('permissions', () => {
  it('lets a reader preview but not change, and names the missing permission', async () => {
    await openSettings(EMAILS, { permissions: ['notifications:read'] });
    const row = await rowOf(TABLE, 'Order received');
    expect(row.getByRole('button', { name: 'Preview Order received' })).toBeEnabled();
    expect(row.getByRole('button', { name: 'Edit Order received' })).toBeDisabled();
    expect(row.getByRole('button', { name: 'Delete Order received' })).toBeDisabled();
    expect(row.getByRole('switch')).toBeDisabled();
    const create = screen.getByRole('button', { name: 'New template' });
    expect(create).toBeDisabled();
    expect(create).toHaveAttribute('title', 'You need the notifications:create permission');
    expect(row.getByRole('button', { name: 'Edit Order received' })).toHaveAttribute(
      'title',
      'You need the notifications:update permission',
    );
  });

  it('lets a role with notifications:* change them', async () => {
    await openSettings(EMAILS, { permissions: ['notifications:*'] });
    expect(await screen.findByRole('button', { name: 'New template' })).toBeEnabled();
  });
});
