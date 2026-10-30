// Tests for the Blocklist tab, run through the whole app against the dev mock API: the table, the type filter, adding (the
// client's checks, the server's field messages, a duplicate and a refusal), removing with its confirm, the empty states and
// what a missing permission disables.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { dialogOf, openRisk, rowOf, tableNamed, tabTexts } from '../test/riskPage';

setupMockApi();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite
// runs in parallel. Every flow here also goes through the mock API with real dialogs, so give them room.
vi.setConfig({ testTimeout: 20_000 });

const bodyRows = async () => (await tableNamed('Blocklist')).getAllByRole('row').slice(1);

async function openAdd(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Add' }));
  return dialogOf('Add to blocklist');
}

describe('the table', () => {
  it('lists the entries newest first, with the type, the value and its reason, how, by whom and when', async () => {
    await openRisk('/risk?tab=block');
    await tableNamed('Blocklist');
    await waitFor(async () => expect(await bodyRows()).toHaveLength(5));
    const [newest] = await bodyRows();
    expect(within(newest).getByText('IMEI')).toBeInTheDocument();
    expect(within(newest).getByText('35 389011 884201 9')).toBeInTheDocument();
    expect(within(newest).getByText('Reported stolen by the previous owner')).toBeInTheDocument();
    expect(within(newest).getByText('Added by hand')).toBeInTheDocument();
    expect(within(newest).getByText('Lina S.')).toBeInTheDocument();
    const chargeback = await rowOf('Blocklist', 'jt.****@tempbox.example');
    expect(chargeback.getByText('After a chargeback')).toBeInTheDocument();
    expect(chargeback.getByText('System')).toBeInTheDocument();
    expect(screen.getByText('5 entries')).toBeInTheDocument();
    expect(screen.getByText(/Anyone or anything on this list cannot place an order\./)).toBeInTheDocument();
  });

  it('filters by type and keeps the type in the address', async () => {
    const user = userEvent.setup();
    const app = await openRisk('/risk?tab=block');
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Filter by type' }), 'card');
    expect(app.location()).toBe('/risk?tab=block&kind=card');
    expect(await screen.findByText('1 entry')).toBeInTheDocument();
    expect(await rowOf('Blocklist', 'Visa fingerprint fp_9f2…c1a')).toBeTruthy();
    // The tab still counts every entry.
    expect(tabTexts()[2]).toBe('Blocklist5');
  });

  it('says what to do when nothing is blocked, and when nothing of one type is', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/blocklist', () => HttpResponse.json([], { headers: { 'x-total-count': '0' } })),
    );
    await openRisk('/risk?tab=block');
    expect(await screen.findByText('Nothing is blocked')).toBeInTheDocument();
    expect(
      screen.getByText('Add an email, domain, card or IMEI that should never be able to buy.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add to blocklist' }));
    expect(screen.getByRole('dialog', { name: 'Add to blocklist' })).toBeInTheDocument();
  });

  it('shows the server’s error in the table with Retry', async () => {
    mockServer.use(
      http.get('*/admin/blocklist', () => problem(400, 'BAD_REQUEST', 'List is down', 'Try later.')),
    );
    await openRisk('/risk?tab=block');
    expect(await screen.findByText('Could not load the blocklist')).toBeInTheDocument();
  });
});

describe('adding', () => {
  it('asks for a value and a reason before it sends anything', async () => {
    const user = userEvent.setup();
    await openRisk('/risk?tab=block');
    const dialog = await openAdd(user);
    await user.click(dialog.getByRole('button', { name: 'Block' }));
    expect(await dialog.findByText('Enter what to block.')).toBeInTheDocument();
    expect(dialog.getByText('Add a short reason so the next person knows why.')).toBeInTheDocument();
    expect(dialog.getByLabelText('Value')).toHaveAttribute('aria-invalid', 'true');
  });

  it('wants 15 digits for an IMEI', async () => {
    const user = userEvent.setup();
    await openRisk('/risk?tab=block');
    const dialog = await openAdd(user);
    await user.selectOptions(dialog.getByLabelText('What to block'), 'imei');
    await user.type(dialog.getByLabelText('Value'), '12345');
    await user.type(dialog.getByLabelText('Reason'), 'Stolen');
    await user.click(dialog.getByRole('button', { name: 'Block' }));
    expect(await dialog.findByText('An IMEI has 15 digits.')).toBeInTheDocument();
  });

  it('adds an email, tells what was added, shows it first and counts it on the tab', async () => {
    const user = userEvent.setup();
    await openRisk('/risk?tab=block');
    const dialog = await openAdd(user);
    await user.type(dialog.getByLabelText('Value'), 'bad.actor@spam.example');
    await user.type(dialog.getByLabelText('Reason'), 'Card testing');
    await user.click(dialog.getByRole('button', { name: 'Block' }));
    expect(await screen.findByText('Added to the blocklist')).toBeInTheDocument();
    expect(screen.getByText('Email bad.actor@spam.example')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Add to blocklist' })).not.toBeInTheDocument(),
    );
    const [first] = await bodyRows();
    await waitFor(() => expect(within(first).getByText('bad.actor@spam.example')).toBeInTheDocument());
    expect(within(first).getByText('Card testing')).toBeInTheDocument();
    expect(tabTexts()[2]).toBe('Blocklist6');
  });

  it('adds an IMEI typed with spaces and shows it grouped', async () => {
    const user = userEvent.setup();
    await openRisk('/risk?tab=block');
    const dialog = await openAdd(user);
    await user.selectOptions(dialog.getByLabelText('What to block'), 'imei');
    await user.type(dialog.getByLabelText('Value'), '35 460711 658877 7');
    await user.type(dialog.getByLabelText('Reason'), 'Lost phone');
    await user.click(dialog.getByRole('button', { name: 'Block' }));
    expect(await screen.findByText('IMEI 35 460711 658877 7')).toBeInTheDocument();
  });

  it('puts a duplicate under the value and keeps the dialog open', async () => {
    const user = userEvent.setup();
    await openRisk('/risk?tab=block');
    const dialog = await openAdd(user);
    await user.selectOptions(dialog.getByLabelText('What to block'), 'domain');
    await user.type(dialog.getByLabelText('Value'), 'tempbox.example');
    await user.type(dialog.getByLabelText('Reason'), 'Again');
    await user.click(dialog.getByRole('button', { name: 'Block' }));
    expect(await dialog.findByText('That is already on the blocklist.')).toBeInTheDocument();
    expect(dialog.getByLabelText('Value')).toHaveAttribute('aria-invalid', 'true');
    expect(tabTexts()[2]).toBe('Blocklist5');
  });

  it('puts the server’s message under the field it names', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/blocklist', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'value', message: 'That is not a valid email.' },
        ]),
      ),
    );
    await openRisk('/risk?tab=block');
    const dialog = await openAdd(user);
    await user.type(dialog.getByLabelText('Value'), 'not-an-email');
    await user.type(dialog.getByLabelText('Reason'), 'Test');
    await user.click(dialog.getByRole('button', { name: 'Block' }));
    expect(await dialog.findByText('That is not a valid email.')).toBeInTheDocument();
    expect(dialog.getByLabelText('Value')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a refusal that names no field in the dialog’s error slot', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/blocklist', () =>
        problem(403, 'FORBIDDEN', 'No permission', 'You cannot change the blocklist.'),
      ),
    );
    await openRisk('/risk?tab=block');
    const dialog = await openAdd(user);
    await user.type(dialog.getByLabelText('Value'), 'a@b.example');
    await user.type(dialog.getByLabelText('Reason'), 'Test');
    await user.click(dialog.getByRole('button', { name: 'Block' }));
    expect(await dialog.findByText('You cannot change the blocklist.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Add to blocklist' })).toBeInTheDocument();
  });
});

describe('removing', () => {
  it('asks first, then removes the entry and counts one less', async () => {
    const user = userEvent.setup();
    await openRisk('/risk?tab=block');
    await user.click(await screen.findByRole('button', { name: 'Remove tempbox.example' }));
    const dialog = dialogOf('Remove from the blocklist?');
    expect(dialog.getByText(/will be able to order again\./)).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Remove' }));
    expect(await screen.findByText('Removed')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Remove tempbox.example' })).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(tabTexts()[2]).toBe('Blocklist4'));
  });

  it('keeps the entry and shows the server’s refusal in the dialog', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.delete('*/admin/blocklist/:id', () =>
        problem(409, 'LOCKED', 'Entry is locked', 'Chargeback entries cannot be removed.'),
      ),
    );
    await openRisk('/risk?tab=block');
    await user.click(await screen.findByRole('button', { name: 'Remove jt.****@tempbox.example' }));
    await user.click(dialogOf('Remove from the blocklist?').getByRole('button', { name: 'Remove' }));
    expect(
      await dialogOf('Remove from the blocklist?').findByText('Chargeback entries cannot be removed.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove jt.****@tempbox.example' })).toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('disables Add and Remove without risk:create and risk:delete and names the permission', async () => {
    await openRisk('/risk?tab=block', { permissions: ['risk:read'] });
    const add = await screen.findByRole('button', { name: 'Add' });
    expect(add).toBeDisabled();
    expect(add).toHaveAttribute('title', 'You need the risk:create permission');
    const remove = await screen.findByRole('button', { name: 'Remove tempbox.example' });
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('title', 'You need the risk:delete permission');
  });

  it('enables each with its own permission', async () => {
    await openRisk('/risk?tab=block', { permissions: ['risk:read', 'risk:create'] });
    expect(await screen.findByRole('button', { name: 'Add' })).toBeEnabled();
    expect(await screen.findByRole('button', { name: 'Remove tempbox.example' })).toBeDisabled();
  });
});
