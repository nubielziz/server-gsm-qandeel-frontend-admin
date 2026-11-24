// Tests for the bulk price change dialog mounted on its own, against the dev mock API: choose a category or the ticked services and a
// change, Preview (the server's old and new prices and its below-floor warnings), then Apply with the same body.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { listServices } from '../api';
import { servicesStore } from '../mocks/store';
import { CLOSED_TEXT, mountDialog } from '../test/dialogHost';
import { recordRequests } from '../test/requests';
import { BulkPriceDialog } from './BulkPriceDialog';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

type User = ReturnType<typeof userEvent.setup>;

/** Opens the dialog (on a category, or on the ticked services given) and waits for its categories when it shows their menu. */
async function openBulk(selectedIds: readonly number[] = [], onApplied: () => void = () => undefined) {
  await signInAs();
  mountDialog((close) => <BulkPriceDialog selectedIds={selectedIds} onClose={close} onApplied={onApplied} />);
  const dialog = within(await screen.findByRole('dialog', { name: 'Bulk price change' }));
  // With ticked services the scope is those services and the category menu is not on screen.
  if (selectedIds.length === 0) await dialog.findByRole('option', { name: 'Credits' });
  return dialog;
}

/** The Credits category, raised or lowered by an amount: three services. */
async function previewCredits(
  user: User,
  direction: 'Raise prices' | 'Lower prices',
  by: string,
  amount: string,
  onApplied?: () => void,
) {
  const dialog = await openBulk([], onApplied);
  await user.selectOptions(dialog.getByRole('combobox', { name: 'Category' }), 'Credits');
  await user.selectOptions(dialog.getByRole('combobox', { name: 'Change' }), direction);
  await user.selectOptions(dialog.getByRole('combobox', { name: 'By' }), by);
  await user.type(dialog.getByRole('textbox', { name: /^(Percentage|Amount \(USD\))$/ }), amount);
  await user.click(dialog.getByRole('button', { name: 'Preview' }));
  return dialog;
}

describe('Bulk price change on the kind and the group of a page', () => {
  /** Opens the dialog the way the Pricing view does: with the kind it shows and the group it is on. */
  async function openOn(type: 'imei' | 'server', categoryId?: number) {
    await signInAs();
    mountDialog((close) => (
      <BulkPriceDialog
        selectedIds={[]}
        type={type}
        categoryId={categoryId}
        onClose={close}
        onApplied={() => undefined}
      />
    ));
    return within(await screen.findByRole('dialog', { name: 'Bulk price change' }));
  }

  it('offers only the groups of the kind, says so, and opens on the group once the groups have arrived', async () => {
    const dialog = await openOn('imei', 4);
    await dialog.findByRole('option', { name: 'Carrier unlock' });
    await waitFor(() =>
      expect(dialog.getByRole('combobox', { name: 'Category' })).toHaveDisplayValue('Carrier unlock'),
    );
    expect(dialog.queryByRole('option', { name: 'Credits' })).not.toBeInTheDocument();
    expect(dialog.getByText(/IMEI groups only\./)).toBeInTheDocument();
  });

  it('sends the starting group without a click on the menu', async () => {
    const user = userEvent.setup();
    const dialog = await openOn('imei', 4);
    await dialog.findByRole('option', { name: 'Carrier unlock' });
    const requests = recordRequests();
    await user.type(dialog.getByRole('textbox', { name: 'Percentage' }), '5');
    await user.click(dialog.getByRole('button', { name: 'Preview' }));
    await dialog.findByRole('table', { name: 'Price changes' });
    const sent = requests.sent().find((one) => one.url.pathname === '/admin/services/bulk-price/preview');
    expect(sent?.body).toMatchObject({ categoryId: 4 });
  });

  it('does not start on a group of another kind', async () => {
    const credits = (await servicesStore()).categories.list().find((category) => category.name === 'Credits');
    const dialog = await openOn('imei', credits?.id);
    await dialog.findByRole('option', { name: 'Carrier unlock' });
    expect(dialog.getByRole('combobox', { name: 'Category' })).toHaveDisplayValue('Choose a category');
    expect(dialog.queryByRole('option', { name: 'Credits' })).not.toBeInTheDocument();
  });
});

describe('Bulk price change', () => {
  it('previews the old and new price of every service in the category, then applies them', async () => {
    const user = userEvent.setup();
    const onApplied = vi.fn();
    const dialog = await previewCredits(user, 'Raise prices', 'A fixed amount (USD)', '1', onApplied);
    const lines = within(await dialog.findByRole('table', { name: 'Price changes' }));
    expect(lines.getAllByRole('row')).toHaveLength(4); // the header and three services
    const z3x = within(lines.getByText('Z3X Credits x10').closest('tr') as HTMLElement);
    expect(z3x.getByText('$9.35')).toBeInTheDocument();
    expect(z3x.getByText('$10.35')).toBeInTheDocument();
    expect(dialog.getByText('Raise prices by $1.00')).toBeInTheDocument();
    // Nothing was saved by the preview.
    expect((await listServices({ q: 'Z3X' })).data[0].basePrice).toBe('9.3500');
    expect(onApplied).not.toHaveBeenCalled();

    await user.click(dialog.getByRole('button', { name: 'Apply to 3 services' }));
    expect(await screen.findByText('3 prices changed')).toBeInTheDocument();
    expect(screen.getByText('New orders use the new prices.')).toBeInTheDocument();
    expect((await listServices({ q: 'Z3X' })).data[0].basePrice).toBe('10.3500');
    expect(await screen.findByText(CLOSED_TEXT)).toBeInTheDocument();
    expect(onApplied).toHaveBeenCalledOnce();
  });

  it('warns about the services that would end under their floor, from the server’s answer', async () => {
    const user = userEvent.setup();
    const dialog = await previewCredits(user, 'Lower prices', 'A percentage', '50');
    expect(await dialog.findByText(/3 services would end under their floor\./)).toBeInTheDocument();
    const lines = within(await dialog.findByRole('table', { name: 'Price changes' }));
    expect(lines.getAllByText(/^Under \$/)).toHaveLength(3);
    expect(dialog.getByText('Lower prices by 50%')).toBeInTheDocument();
  });

  it('goes back to the settings with the values kept', async () => {
    const user = userEvent.setup();
    const dialog = await previewCredits(user, 'Raise prices', 'A fixed amount (USD)', '1');
    await dialog.findByRole('table', { name: 'Price changes' });
    await user.click(dialog.getByRole('button', { name: 'Change the settings' }));
    expect(dialog.getByRole('textbox', { name: 'Amount (USD)' })).toHaveValue('1');
    expect(dialog.getByRole('combobox', { name: 'Category' })).toHaveDisplayValue('Credits');
  });

  it('uses the ticked services when there are some, and tells its host once the prices are applied', async () => {
    const user = userEvent.setup();
    const onApplied = vi.fn();
    const dialog = await openBulk([9, 10], onApplied);
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
    // The host unticks the services once the prices are applied.
    expect(onApplied).toHaveBeenCalledOnce();
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
    const dialog = await openBulk();
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
    const dialog = await openBulk([9]);
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
    await signInAs();
    mountDialog((close) => <BulkPriceDialog selectedIds={[]} onClose={close} onApplied={() => undefined} />);
    const dialog = within(await screen.findByRole('dialog', { name: 'Bulk price change' }));
    expect(await dialog.findByText(/Could not load the categories\./)).toBeInTheDocument();
    // The categories come back; Retry asks again.
    mockServer.resetHandlers();
    await user.click(dialog.getByRole('button', { name: 'Retry' }));
    expect(await dialog.findByRole('option', { name: 'Credits' })).toBeInTheDocument();
    expect(dialog.queryByText(/Could not load the categories/)).not.toBeInTheDocument();
  });

  it('asks for an amount before it calls the server', async () => {
    const user = userEvent.setup();
    const dialog = await openBulk();
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Category' }), 'Credits');
    await user.click(dialog.getByRole('button', { name: 'Preview' }));
    expect(await dialog.findByText('Enter an amount greater than zero.')).toBeInTheDocument();
    expect(dialog.queryByRole('table', { name: 'Price changes' })).not.toBeInTheDocument();
  });

  it('asks for a category when none is chosen', async () => {
    const user = userEvent.setup();
    const dialog = await openBulk();
    await user.type(dialog.getByRole('textbox', { name: 'Percentage' }), '5');
    await user.click(dialog.getByRole('button', { name: 'Preview' }));
    expect(await dialog.findByText('Choose a category.')).toBeInTheDocument();
  });

  it('shows the server’s refusal under the amount when the change is not allowed', async () => {
    const user = userEvent.setup();
    const dialog = await openBulk();
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Category' }), 'Credits');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Change' }), 'Lower prices');
    await user.type(dialog.getByRole('textbox', { name: 'Percentage' }), '100');
    await user.click(dialog.getByRole('button', { name: 'Preview' }));
    expect(await dialog.findByText(/The change would make .* free\./)).toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: 'Percentage' })).toHaveAttribute('aria-invalid', 'true');
  });
});
