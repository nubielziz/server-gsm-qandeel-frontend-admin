// Tests for the maintenance controls, run through the whole app against the dev mock API: the dialog that turns maintenance on
// or changes it (scope, message, expected end, the effect sentence, the request body, the server's refusals) and the
// separate confirm that turns it off.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupHealthMocks } from '../mocks/testing';
import { openHealthPage } from '../test/openHealthPage';
import { SLOW } from '../test/pageQueries';
import { recordRequests } from '../test/recordRequests';

setupHealthMocks();
vi.setConfig({ testTimeout: 30_000 });

const CHECKOUT_EFFECT =
  'Customers using checkout get 503 MAINTENANCE with your message until you turn it off. This console is not affected.';

/** Opens the page, waits for the header button to know the state, and opens the maintenance dialog. */
async function openDialog(scenario?: 'maintenance') {
  const user = userEvent.setup();
  await openHealthPage({ scenario });
  const name = scenario === 'maintenance' ? 'Maintenance is on' : 'Maintenance';
  await user.click(await screen.findByRole('button', { name }, SLOW));
  const dialog = await screen.findByRole('dialog', { name: 'Maintenance mode' });
  return { user, dialog: within(dialog) };
}

describe('turning maintenance on', () => {
  it('asks for the scope, the message and an optional end, and states what customers get before the confirm button', async () => {
    const { user, dialog } = await openDialog();
    const scopes = dialog.getAllByRole('radio');
    expect(scopes.map((radio) => radio.closest('label')?.textContent)).toEqual([
      'StoreThe customer storefront.',
      'CheckoutCheckout only. Browsing stays open.',
      'API ordersOrders sent by merchants through the API.',
      'All of themThe store, checkout and API orders.',
    ]);
    // Nothing is picked for the staff member.
    expect(scopes.every((radio) => !(radio as HTMLInputElement).checked)).toBe(true);
    expect(dialog.getByLabelText('Message for customers')).toHaveValue('');
    expect(dialog.getByLabelText('Expected end (optional)')).toHaveAttribute('type', 'datetime-local');
    expect(dialog.getByRole('note')).toHaveTextContent(
      'Customers using the part you choose get 503 MAINTENANCE with your message until you turn it off.',
    );
    expect(dialog.queryByRole('button', { name: 'Turn off maintenance' })).not.toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Turn on maintenance' })).toBeInTheDocument();

    await user.click(dialog.getByRole('radio', { name: /Checkout/ }));
    expect(dialog.getByRole('note')).toHaveTextContent(CHECKOUT_EFFECT);
    await user.click(dialog.getByRole('radio', { name: /All of them/ }));
    expect(dialog.getByRole('note')).toHaveTextContent(
      'Customers using the store, checkout and API orders get 503 MAINTENANCE',
    );
  });

  it('needs a scope and a message, and sends nothing until it has both', async () => {
    const writes = recordRequests('put', '/admin/system/maintenance');
    const { user, dialog } = await openDialog();
    await user.click(dialog.getByRole('button', { name: 'Turn on maintenance' }));
    expect(await dialog.findByText('Choose what to close.')).toBeInTheDocument();
    expect(dialog.getByText('Write the message customers will see.')).toBeInTheDocument();
    await user.click(dialog.getByRole('radio', { name: /Store/ }));
    await user.type(dialog.getByLabelText('Message for customers'), '   ');
    await user.click(dialog.getByRole('button', { name: 'Turn on maintenance' }));
    expect(await dialog.findByText('Write the message customers will see.')).toBeInTheDocument();
    expect(writes).toHaveLength(0);
  });

  it('sends the scope, the trimmed message and the expected end, then closes, toasts and shows maintenance everywhere', async () => {
    const writes = recordRequests('put', '/admin/system/maintenance');
    const { user, dialog } = await openDialog();
    await user.click(dialog.getByRole('radio', { name: /Checkout/ }));
    await user.type(dialog.getByLabelText('Message for customers'), '  We are back at 16:00.  ');
    const end = dialog.getByLabelText('Expected end (optional)');
    await user.type(end, '2099-01-02T16:30');
    await user.click(dialog.getByRole('button', { name: 'Turn on maintenance' }));

    await waitFor(() => expect(writes).toHaveLength(1), SLOW);
    expect(writes[0].body).toEqual({
      enabled: true,
      scope: 'checkout',
      message: 'We are back at 16:00.',
      expectedEndAt: new Date(2099, 0, 2, 16, 30).toISOString(),
    });
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Maintenance mode' })).not.toBeInTheDocument(),
    );
    // The success toast says what changed.
    expect(await screen.findByText('Maintenance is on for checkout')).toBeInTheDocument();
    // The health summary was read again: the header button and the shell banner show the new state.
    expect(await screen.findByRole('button', { name: 'Maintenance is on' }, SLOW)).toBeInTheDocument();
    const banner = await screen.findByText('Maintenance is on for checkout.', undefined, SLOW);
    expect(banner.closest('[role="status"]')).toHaveTextContent('Customers see “We are back at 16:00.”');
  });

  it('sends no end time when the field is left empty', async () => {
    const writes = recordRequests('put', '/admin/system/maintenance');
    const { user, dialog } = await openDialog();
    await user.click(dialog.getByRole('radio', { name: /^API orders/ }));
    await user.type(dialog.getByLabelText('Message for customers'), 'API orders are paused.');
    await user.click(dialog.getByRole('button', { name: 'Turn on maintenance' }));
    await waitFor(() => expect(writes).toHaveLength(1), SLOW);
    expect(writes[0].body).toEqual({
      enabled: true,
      scope: 'api_orders',
      message: 'API orders are paused.',
      expectedEndAt: null,
    });
  });

  it("puts the server's message about the end time under that field and keeps the dialog open", async () => {
    const { user, dialog } = await openDialog();
    await user.click(dialog.getByRole('radio', { name: /Store/ }));
    await user.type(dialog.getByLabelText('Message for customers'), 'Back soon.');
    await user.type(dialog.getByLabelText('Expected end (optional)'), '2020-01-01T10:00');
    await user.click(dialog.getByRole('button', { name: 'Turn on maintenance' }));
    const field = dialog.getByLabelText('Expected end (optional)');
    await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'), SLOW);
    expect(dialog.getByText('The expected end must be a time in the future.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Maintenance mode' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Maintenance is on' })).not.toBeInTheDocument();
  });

  it("shows the server's refusal in the dialog and keeps what was typed", async () => {
    mockServer.use(
      http.put('*/admin/system/maintenance', () =>
        problem(403, 'FORBIDDEN', 'Forbidden', 'You need the system:manage permission.'),
      ),
    );
    const { user, dialog } = await openDialog();
    await user.click(dialog.getByRole('radio', { name: /Store/ }));
    await user.type(dialog.getByLabelText('Message for customers'), 'Back soon.');
    await user.click(dialog.getByRole('button', { name: 'Turn on maintenance' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent('You need the system:manage permission.');
    expect(dialog.getByLabelText('Message for customers')).toHaveValue('Back soon.');
    expect(dialog.getByRole('radio', { name: /Store/ })).toBeChecked();
  });

  it('closes with Cancel and sends nothing', async () => {
    const writes = recordRequests('put', '/admin/system/maintenance');
    const { user, dialog } = await openDialog();
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Maintenance mode' })).not.toBeInTheDocument(),
    );
    expect(writes).toHaveLength(0);
  });
});

describe('changing and turning off maintenance', () => {
  it('starts from the running values and says who started it', async () => {
    const { dialog } = await openDialog('maintenance');
    expect(dialog.getByRole('radio', { name: /Checkout/ })).toBeChecked();
    expect((dialog.getByLabelText('Message for customers') as HTMLTextAreaElement).value).not.toBe('');
    expect(
      dialog.getByText(/Maintenance is on for checkout since .* \(started by Dana M\.\)\./),
    ).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    expect(dialog.getByRole('note')).toHaveTextContent(CHECKOUT_EFFECT);
  });

  it('saves a new message with the same scope', async () => {
    const writes = recordRequests('put', '/admin/system/maintenance');
    const { user, dialog } = await openDialog('maintenance');
    const message = dialog.getByLabelText('Message for customers');
    await user.clear(message);
    await user.type(message, 'Checkout is back at 18:00.');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(writes).toHaveLength(1), SLOW);
    expect(writes[0].body).toMatchObject({
      enabled: true,
      scope: 'checkout',
      message: 'Checkout is back at 18:00.',
    });
  });

  it('turns it off only after a separate confirm that says what customers get back', async () => {
    const writes = recordRequests('put', '/admin/system/maintenance');
    const { user, dialog } = await openDialog('maintenance');
    await user.click(dialog.getByRole('button', { name: 'Turn off maintenance' }));
    // The first dialog is swapped for the confirm; nothing was sent yet.
    const confirm = within(await screen.findByRole('dialog', { name: 'Turn off maintenance?' }));
    expect(screen.queryByRole('dialog', { name: 'Maintenance mode' })).not.toBeInTheDocument();
    expect(
      confirm.getByText(/^Customers can use checkout again, and your message stops showing\./),
    ).toBeInTheDocument();
    expect(writes).toHaveLength(0);

    await user.click(confirm.getByRole('button', { name: 'Turn off maintenance' }));
    await waitFor(() => expect(writes).toHaveLength(1), SLOW);
    expect(writes[0].body).toEqual({ enabled: false });
    expect(await screen.findByText('Maintenance is off')).toBeInTheDocument();
    // The header button and the banner follow.
    expect(await screen.findByRole('button', { name: 'Maintenance' }, SLOW)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/^Maintenance is on for/)).not.toBeInTheDocument(), SLOW);
  });

  it('leaves maintenance on when the confirm is cancelled', async () => {
    const writes = recordRequests('put', '/admin/system/maintenance');
    const { user, dialog } = await openDialog('maintenance');
    await user.click(dialog.getByRole('button', { name: 'Turn off maintenance' }));
    const confirm = within(await screen.findByRole('dialog', { name: 'Turn off maintenance?' }));
    await user.click(confirm.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(writes).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Maintenance is on' })).toBeInTheDocument();
  });
});
