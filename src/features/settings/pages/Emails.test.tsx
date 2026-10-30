// Tests for the Customer emails tab, run through the whole app against the dev mock API: the templates and their menus, the Send switch
// with the check before a receipt goes off, the server's preview as text and as sandboxed HTML, new, edit and delete, permissions.
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { getTemplate, listTemplates } from '../api';
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
    expect(received.getByText('Customer · Email · en')).toBeInTheDocument();
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
    expect(screen.getByText('6 templates')).toBeInTheDocument();
  });

  it('switches to the merchant messages and filters by channel', async () => {
    const user = userEvent.setup();
    const app = await openSettings(EMAILS);
    await screen.findByText('Order received');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Who receives it' }), 'merchant');
    expect(await screen.findByRole('heading', { name: 'Merchant messages' })).toBeInTheDocument();
    expect(app.location()).toBe('/settings?tab=notifications&audience=merchant');
    expect(await screen.findByText('Deposit approved')).toBeInTheDocument();
    expect((await rowOf(TABLE, 'Order completed')).getByText('Merchant · Telegram · en')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Channel' }), 'telegram');
    await waitFor(() => expect(screen.queryByText('Deposit approved')).not.toBeInTheDocument());
    await user.selectOptions(screen.getByRole('combobox', { name: 'Who receives it' }), 'all');
    expect(await screen.findByRole('heading', { name: 'All messages' })).toBeInTheDocument();
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
    expect(dialog.getByText(/From GSM Supply/)).toBeInTheDocument();
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
    expect(dialog.getByRole('textbox', { name: 'Event' })).toHaveAttribute('readonly');
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
  it('adds an email template, and a Telegram one has no subject', async () => {
    const user = userEvent.setup();
    await openSettings(EMAILS);
    await user.click(await screen.findByRole('button', { name: 'New template' }));
    const dialog = dialogOf('New template');
    await user.type(dialog.getByRole('textbox', { name: 'Event' }), 'refund.issued');
    await user.type(dialog.getByRole('textbox', { name: 'Subject' }), 'Your refund');
    await user.type(dialog.getByRole('textbox', { name: 'Message' }), 'We refunded your money.');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Channel' }), 'telegram');
    expect(dialog.queryByRole('textbox', { name: 'Subject' })).not.toBeInTheDocument();
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Channel' }), 'email');
    await user.click(dialog.getByRole('button', { name: 'Create template' }));
    expect(await screen.findByText('Refund issued added')).toBeInTheDocument();
    expect((await rowOf(TABLE, 'Refund issued')).getByText('Customer · Email · en')).toBeInTheDocument();
  });

  it('shows the server’s message when the same template already exists', async () => {
    const user = userEvent.setup();
    await openSettings(EMAILS);
    await user.click(await screen.findByRole('button', { name: 'New template' }));
    const dialog = dialogOf('New template');
    await user.type(dialog.getByRole('textbox', { name: 'Event' }), 'order.received');
    await user.type(dialog.getByRole('textbox', { name: 'Subject' }), 'Again');
    await user.type(dialog.getByRole('textbox', { name: 'Message' }), 'Again.');
    await user.click(dialog.getByRole('button', { name: 'Create template' }));
    expect(
      await dialog.findByText('A template for this event, channel and language already exists.'),
    ).toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: 'Event' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('asks for the event, subject and message first', async () => {
    const user = userEvent.setup();
    await openSettings(EMAILS);
    await user.click(await screen.findByRole('button', { name: 'New template' }));
    await user.click(dialogOf('New template').getByRole('button', { name: 'Create template' }));
    const dialog = dialogOf('New template');
    expect(await dialog.findByText('Enter the event.')).toBeInTheDocument();
    expect(dialog.getByText('An email needs a subject.')).toBeInTheDocument();
    expect(dialog.getByText('Write the message.')).toBeInTheDocument();
  });
});

describe('Delete', () => {
  it('deletes a template after a review step', async () => {
    const user = userEvent.setup();
    await openSettings(EMAILS);
    await user.click(
      (await rowOf(TABLE, 'Checkout abandoned')).getByRole('button', { name: 'Delete Checkout abandoned' }),
    );
    await user.click(
      dialogOf('Delete “Checkout abandoned”?').getByRole('button', { name: 'Delete template' }),
    );
    expect(await screen.findByText('Checkout abandoned deleted')).toBeInTheDocument();
    expect((await listTemplates()).data.some((template) => template.event === 'checkout.abandoned')).toBe(
      false,
    );
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
