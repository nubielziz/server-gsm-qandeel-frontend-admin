// Tests for the bulk price change, run through the whole app against the dev mock API: choose a category or ticked services and a
// change, Preview (the server's old and new prices and its below-floor warnings), then Apply with the same body.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { listServices } from '../api';
import { dialogOf, openServices } from '../test/servicesPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

type User = ReturnType<typeof userEvent.setup>;

/** Opens the dialog from the page header and waits for its categories. */
async function openBulk(user: User) {
  await user.click(await screen.findByRole('button', { name: 'Bulk price change…' }));
  const dialog = dialogOf('Bulk price change');
  await dialog.findByRole('option', { name: 'Credits' });
  return dialog;
}

/** The Credits category, raised by a fixed amount: three services. */
async function previewCredits(
  user: User,
  direction: 'Raise prices' | 'Lower prices',
  by: string,
  amount: string,
) {
  const dialog = await openBulk(user);
  await user.selectOptions(dialog.getByRole('combobox', { name: 'Category' }), 'Credits');
  await user.selectOptions(dialog.getByRole('combobox', { name: 'Change' }), direction);
  await user.selectOptions(dialog.getByRole('combobox', { name: 'By' }), by);
  await user.type(dialog.getByRole('textbox', { name: /^(Percentage|Amount \(USD\))$/ }), amount);
  await user.click(dialog.getByRole('button', { name: 'Preview' }));
  return dialog;
}

describe('Bulk price change', () => {
  it('previews the old and new price of every service in the category, then applies them', async () => {
    const user = userEvent.setup();
    await openServices();
    const dialog = await previewCredits(user, 'Raise prices', 'A fixed amount (USD)', '1');
    const lines = within(await dialog.findByRole('table', { name: 'Price changes' }));
    expect(lines.getAllByRole('row')).toHaveLength(4); // the header and three services
    const z3x = within(lines.getByText('Z3X Credits x10').closest('tr') as HTMLElement);
    expect(z3x.getByText('$9.35')).toBeInTheDocument();
    expect(z3x.getByText('$10.35')).toBeInTheDocument();
    expect(dialog.getByText('Raise prices by $1.00')).toBeInTheDocument();
    // Nothing was saved by the preview.
    expect((await listServices({ q: 'Z3X' })).data[0].basePrice).toBe('9.3500');

    await user.click(dialog.getByRole('button', { name: 'Apply to 3 services' }));
    expect(await screen.findByText('3 prices changed')).toBeInTheDocument();
    expect(screen.getByText('New orders use the new prices.')).toBeInTheDocument();
    expect((await listServices({ q: 'Z3X' })).data[0].basePrice).toBe('10.3500');
    expect(screen.queryByRole('dialog', { name: 'Bulk price change' })).not.toBeInTheDocument();
  });

  it('warns about the services that would end under their floor, from the server’s answer', async () => {
    const user = userEvent.setup();
    await openServices();
    const dialog = await previewCredits(user, 'Lower prices', 'A percentage', '50');
    expect(await dialog.findByText(/3 services would end under their floor\./)).toBeInTheDocument();
    const lines = within(await dialog.findByRole('table', { name: 'Price changes' }));
    expect(lines.getAllByText(/^Under \$/)).toHaveLength(3);
    expect(dialog.getByText('Lower prices by 50%')).toBeInTheDocument();
  });

  it('goes back to the settings with the values kept', async () => {
    const user = userEvent.setup();
    await openServices();
    const dialog = await previewCredits(user, 'Raise prices', 'A fixed amount (USD)', '1');
    await dialog.findByRole('table', { name: 'Price changes' });
    await user.click(dialog.getByRole('button', { name: 'Change the settings' }));
    expect(dialog.getByRole('textbox', { name: 'Amount (USD)' })).toHaveValue('1');
    expect(dialog.getByRole('combobox', { name: 'Category' })).toHaveDisplayValue('Credits');
  });

  it('uses the ticked services when there are some', async () => {
    const user = userEvent.setup();
    await openServices();
    await user.click(await screen.findByRole('checkbox', { name: 'Select row 9' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select row 10' }));
    const bar = within(screen.getByRole('region', { name: 'Selected services' }));
    expect(bar.getByText('2 selected')).toBeInTheDocument();
    await user.click(bar.getByRole('button', { name: 'Change their prices…' }));
    const dialog = dialogOf('Bulk price change');
    expect(dialog.getByRole('combobox', { name: 'Change the prices of' })).toHaveDisplayValue(
      'The 2 services I ticked',
    );
    await user.type(dialog.getByRole('textbox', { name: 'Percentage' }), '10');
    await user.click(dialog.getByRole('button', { name: 'Preview' }));
    const lines = within(await dialog.findByRole('table', { name: 'Price changes' }));
    expect(lines.getAllByRole('row')).toHaveLength(3);
    expect(lines.getByText('EE UK Unlock')).toBeInTheDocument();
    expect(lines.getByText('Orange France Unlock')).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Apply to 2 services' }));
    expect(await screen.findByText('2 prices changed')).toBeInTheDocument();
    // The ticks are cleared once the prices are applied.
    expect(screen.queryByRole('region', { name: 'Selected services' })).not.toBeInTheDocument();
  });

  it('shows the server’s messages under the kind of change and the amount', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/services/bulk-price/preview', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'change.type', message: 'Fixed changes are closed today.' },
          { field: 'change.value', message: 'That is more than a bulk change may move.' },
        ]),
      ),
    );
    await openServices();
    const dialog = await openBulk(user);
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Category' }), 'Credits');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'By' }), 'A fixed amount (USD)');
    await user.type(dialog.getByRole('textbox', { name: 'Amount (USD)' }), '1');
    await user.click(dialog.getByRole('button', { name: 'Preview' }));
    expect(await dialog.findByText('Fixed changes are closed today.')).toBeInTheDocument();
    expect(dialog.getByRole('combobox', { name: 'By' })).toHaveAttribute('aria-invalid', 'true');
    expect(dialog.getByText('That is more than a bulk change may move.')).toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: 'Amount (USD)' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('puts a message about the category in the error slot when the ticked services are the scope', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/services/bulk-price/preview', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'categoryId', message: 'Name a category or services, not both.' },
          { field: 'serviceIds', message: 'One of these services is retired.' },
        ]),
      ),
    );
    await openServices();
    await user.click(await screen.findByRole('checkbox', { name: 'Select row 9' }));
    await user.click(screen.getByRole('button', { name: 'Change their prices…' }));
    const dialog = dialogOf('Bulk price change');
    await user.type(dialog.getByRole('textbox', { name: 'Percentage' }), '5');
    await user.click(dialog.getByRole('button', { name: 'Preview' }));
    // `serviceIds` is the "ticked services" menu; the category menu is not on screen, so its message is in the slot.
    expect(await dialog.findByText('One of these services is retired.')).toBeInTheDocument();
    expect(dialog.getByRole('combobox', { name: 'Change the prices of' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(dialog.getByRole('alert')).toHaveTextContent('categoryId: Name a category or services, not both.');
  });

  it('says so, with a Retry, when the categories could not be loaded', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/service-categories', () => problem(403, 'FORBIDDEN', 'No access', 'Closed.')),
    );
    await openServices();
    await user.click(await screen.findByRole('button', { name: 'Bulk price change…' }));
    const dialog = dialogOf('Bulk price change');
    expect(await dialog.findByText(/Could not load the categories\./)).toBeInTheDocument();
    // The categories come back; Retry asks again.
    mockServer.resetHandlers();
    await user.click(dialog.getByRole('button', { name: 'Retry' }));
    expect(await dialog.findByRole('option', { name: 'Credits' })).toBeInTheDocument();
    expect(dialog.queryByText(/Could not load the categories/)).not.toBeInTheDocument();
  });

  it('asks for an amount before it calls the server', async () => {
    const user = userEvent.setup();
    await openServices();
    const dialog = await openBulk(user);
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Category' }), 'Credits');
    await user.click(dialog.getByRole('button', { name: 'Preview' }));
    expect(await dialog.findByText('Enter an amount greater than zero.')).toBeInTheDocument();
    expect(dialog.queryByRole('table', { name: 'Price changes' })).not.toBeInTheDocument();
  });

  it('asks for a category when none is chosen', async () => {
    const user = userEvent.setup();
    await openServices();
    const dialog = await openBulk(user);
    await user.type(dialog.getByRole('textbox', { name: 'Percentage' }), '5');
    await user.click(dialog.getByRole('button', { name: 'Preview' }));
    expect(await dialog.findByText('Choose a category.')).toBeInTheDocument();
  });

  it('shows the server’s refusal under the amount when the change is not allowed', async () => {
    const user = userEvent.setup();
    await openServices();
    const dialog = await openBulk(user);
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Category' }), 'Credits');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Change' }), 'Lower prices');
    await user.type(dialog.getByRole('textbox', { name: 'Percentage' }), '100');
    await user.click(dialog.getByRole('button', { name: 'Preview' }));
    expect(await dialog.findByText(/The change would make .* free\./)).toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: 'Percentage' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('is disabled without pricing:update', async () => {
    await openServices('/services', { permissions: ['catalog:read'] });
    const button = await screen.findByRole('button', { name: 'Bulk price change…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'You need the pricing:update permission');
  });
});
