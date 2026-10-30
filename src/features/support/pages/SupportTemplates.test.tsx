// Tests for the Templates view (`?view=templates`), run through the whole app against the dev mock API: the list, adding, editing
// and deleting a template, the variable preview, the server's refusals under the fields, the permission buttons, and the states.
import { screen, waitFor, within, type BoundFunctions, type queries } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { openSupport, optionTexts, templateBox } from '../test/supportPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

/** Opens the Templates view and waits for its table. */
async function openTemplates(options: { permissions?: string[] } = {}) {
  const app = await openSupport('/support?view=templates', options);
  const table = await screen.findByRole('table', { name: 'Reply templates' }, { timeout: 10_000 });
  return { app, table: within(table) };
}

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

const rowOf = (title: string) => within(screen.getByText(title).closest('tr') as HTMLElement);
const titles = (table: BoundFunctions<typeof queries>) =>
  table
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0]?.textContent);

describe('the list', () => {
  it('opens from the header, lists the templates by title and goes back to the inbox', async () => {
    const user = userEvent.setup();
    const app = await openSupport();
    await user.click(screen.getByRole('button', { name: 'Manage templates' }));
    expect(app.location()).toBe('/support?view=templates');
    const table = within(await screen.findByRole('table', { name: 'Reply templates' }));
    expect(titles(table)).toEqual([
      'Eligibility question',
      'Failed unlock: refund issued',
      'How to enter the unlock code',
      'Invoice request',
      'Order is in progress',
      'Refund approved',
      'Refund not possible after delivery',
      'Wrong IMEI entered',
    ]);
    expect(screen.getByText('8 templates')).toBeInTheDocument();
    expect(rowOf('Invoice request').getByText('Billing')).toBeInTheDocument();
    expect(rowOf('Invoice request').getByText('English')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back to the inbox' }));
    expect(app.location()).toBe('/support');
    expect(await screen.findByRole('list', { name: 'Tickets' })).toBeInTheDocument();
  });

  it('says so when there are no templates', async () => {
    mockServer.use(
      http.get('*/admin/reply-templates', () =>
        HttpResponse.json([], {
          headers: { 'x-total-count': '0', 'access-control-expose-headers': 'x-total-count' },
        }),
      ),
    );
    await openSupport('/support?view=templates');
    expect(await screen.findByText('No reply templates', {}, { timeout: 10_000 })).toBeInTheDocument();
  });

  it('shows the server’s error with a Retry button when the list cannot load', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/reply-templates', () =>
        problem(503, 'UNAVAILABLE', 'Service unavailable', 'Try again soon.'),
      ),
    );
    await openSupport('/support?view=templates');
    expect(
      await screen.findByText('Could not load the reply templates', {}, { timeout: 5_000 }),
    ).toBeInTheDocument();
    mockServer.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('table', { name: 'Reply templates' })).toBeInTheDocument();
  });
});

describe('adding a template', () => {
  it('previews the variables with sample values, warns about an unknown one, and adds the template', async () => {
    const user = userEvent.setup();
    const bodies = recorded('post', '*/admin/reply-templates');
    const { table } = await openTemplates();
    await user.click(screen.getByRole('button', { name: 'New template' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'New template' }));

    expect(dialog.getByText('Nothing to preview yet.')).toBeInTheDocument();
    expect(dialog.getByRole('list', { name: 'Variables' })).toHaveTextContent(
      '{{name}} is the customer’s first name',
    );
    await user.type(dialog.getByLabelText('Title'), 'Zebra reply');
    await user.selectOptions(dialog.getByLabelText('Category'), 'refund');
    await user.selectOptions(dialog.getByLabelText('Language'), 'ar');
    await user.type(dialog.getByLabelText('Shortcut'), '/zebra');
    await user.click(dialog.getByLabelText('Text'));
    await user.paste('Hi {{name}}, order {{order}} is {{status}} within {{eta}}.');
    expect(dialog.getByTestId('template-preview')).toHaveTextContent(
      'Hi Alex, order SF-20490 is {{status}} within 2h.',
    );
    expect(dialog.getByRole('status')).toHaveTextContent(
      '{{status}} is not a known variable and will be sent as written.',
    );

    await user.click(dialog.getByRole('button', { name: 'Add template' }));
    expect(await screen.findByText('Template added')).toBeInTheDocument();
    expect(bodies).toEqual([
      {
        title: 'Zebra reply',
        category: 'refund',
        locale: 'ar',
        shortcut: '/zebra',
        body: 'Hi {{name}}, order {{order}} is {{status}} within {{eta}}.',
      },
    ]);
    await waitFor(() => expect(titles(table).at(-1)).toBe('Zebra reply'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks for a title and a text before sending', async () => {
    const user = userEvent.setup();
    const bodies = recorded('post', '*/admin/reply-templates');
    await openTemplates();
    await user.click(screen.getByRole('button', { name: 'New template' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'New template' }));
    await user.click(dialog.getByRole('button', { name: 'Add template' }));
    expect(await dialog.findByText('Give the template a title.')).toBeInTheDocument();
    expect(dialog.getByText('Write the reply text.')).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it('puts the server’s refusal under the shortcut field and keeps the dialog open', async () => {
    const user = userEvent.setup();
    await openTemplates();
    await user.click(screen.getByRole('button', { name: 'New template' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'New template' }));
    await user.type(dialog.getByLabelText('Title'), 'Zebra reply');
    await user.type(dialog.getByLabelText('Shortcut'), 'zebra');
    await user.type(dialog.getByLabelText('Text'), 'Hello');
    await user.click(dialog.getByRole('button', { name: 'Add template' }));
    expect(await dialog.findByText('A shortcut starts with a slash, like /refund.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'New template' })).toBeInTheDocument();
  });

  it('puts "shortcut taken" under the shortcut field too', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/reply-templates', () =>
        problem(
          409,
          'SHORTCUT_TAKEN',
          'Shortcut already used',
          '/refund already belongs to “Refund approved”.',
        ),
      ),
    );
    await openTemplates();
    await user.click(screen.getByRole('button', { name: 'New template' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'New template' }));
    await user.type(dialog.getByLabelText('Title'), 'Another');
    await user.type(dialog.getByLabelText('Shortcut'), '/refund');
    await user.type(dialog.getByLabelText('Text'), 'Hello');
    await user.click(dialog.getByRole('button', { name: 'Add template' }));
    expect(await dialog.findByText('/refund already belongs to “Refund approved”.')).toBeInTheDocument();
  });

  it('offers the new template in the reply box of a ticket of its category', async () => {
    const user = userEvent.setup();
    await openTemplates();
    await user.click(screen.getByRole('button', { name: 'New template' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'New template' }));
    await user.type(dialog.getByLabelText('Title'), 'Zebra reply');
    // The first ticket of the inbox (T-4202) is about a failed unlock.
    await user.selectOptions(dialog.getByLabelText('Category'), 'failed_unlock');
    await user.type(dialog.getByLabelText('Text'), 'Hello there');
    await user.click(dialog.getByRole('button', { name: 'Add template' }));
    await screen.findByText('Template added');
    await user.click(screen.getByRole('button', { name: 'Back to the inbox' }));
    const picker = await templateBox();
    await waitFor(() => expect(optionTexts(picker)).toContain('Zebra reply'));
  });
});

describe('editing a template', () => {
  it('fills the form, sends only what changed and updates the row', async () => {
    const user = userEvent.setup();
    const bodies = recorded('patch', '*/admin/reply-templates/:id');
    const { table } = await openTemplates();
    await user.click(table.getByRole('button', { name: 'Edit Refund approved' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Edit Refund approved' }));
    expect(dialog.getByLabelText('Title')).toHaveValue('Refund approved');
    expect(dialog.getByLabelText('Category')).toHaveValue('refund');
    expect((dialog.getByLabelText('Text') as HTMLTextAreaElement).value).toContain(
      'Hi {{name}}, your refund for {{order}}',
    );
    await user.clear(dialog.getByLabelText('Title'));
    await user.type(dialog.getByLabelText('Title'), 'Refund sent');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Template saved')).toBeInTheDocument();
    expect(bodies).toEqual([{ title: 'Refund sent' }]);
    await waitFor(() => expect(table.getByText('Refund sent')).toBeInTheDocument());
    expect(table.queryByText('Refund approved')).not.toBeInTheDocument();
  });

  it('sends nothing when nothing changed', async () => {
    const user = userEvent.setup();
    const bodies = recorded('patch', '*/admin/reply-templates/:id');
    const { table } = await openTemplates();
    await user.click(table.getByRole('button', { name: 'Edit Refund approved' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Edit Refund approved' }));
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });
});

describe('deleting a template', () => {
  it('asks first, then removes the row', async () => {
    const user = userEvent.setup();
    const { table } = await openTemplates();
    await user.click(table.getByRole('button', { name: 'Delete Invoice request' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Delete Invoice request?' }));
    expect(dialog.getByText(/Replies already sent keep their text/)).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Delete template' }));
    expect(await screen.findByText('Template deleted')).toBeInTheDocument();
    await waitFor(() => expect(table.queryByText('Invoice request')).not.toBeInTheDocument());
    expect(titles(table)).toHaveLength(7);
  });

  it('shows the server’s refusal in the dialog', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.delete('*/admin/reply-templates/:id', () =>
        problem(409, 'IN_USE', 'Template in use', 'An automation uses this template.'),
      ),
    );
    const { table } = await openTemplates();
    await user.click(table.getByRole('button', { name: 'Delete Invoice request' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Delete Invoice request?' }));
    await user.click(dialog.getByRole('button', { name: 'Delete template' }));
    expect(await dialog.findByText('An automation uses this template.')).toBeInTheDocument();
    expect(table.getByText('Invoice request')).toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('lets a reader see the templates but turns every change off, naming the permission', async () => {
    const { table } = await openTemplates({ permissions: ['support:read'] });
    expect(screen.getByRole('button', { name: 'New template' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'New template' })).toHaveAttribute(
      'title',
      'You need the support:create permission',
    );
    expect(table.getByRole('button', { name: 'Edit Refund approved' })).toBeDisabled();
    expect(table.getByRole('button', { name: 'Edit Refund approved' })).toHaveAttribute(
      'title',
      'You need the support:update permission',
    );
    expect(table.getByRole('button', { name: 'Delete Refund approved' })).toBeDisabled();
    expect(table.getByRole('button', { name: 'Delete Refund approved' })).toHaveAttribute(
      'title',
      'You need the support:delete permission',
    );
  });

  it('turns on only what the permissions allow', async () => {
    const { table } = await openTemplates({ permissions: ['support:read', 'support:update'] });
    expect(screen.getByRole('button', { name: 'New template' })).toBeDisabled();
    expect(table.getByRole('button', { name: 'Edit Refund approved' })).toBeEnabled();
    expect(table.getByRole('button', { name: 'Delete Refund approved' })).toBeDisabled();
  });
});
