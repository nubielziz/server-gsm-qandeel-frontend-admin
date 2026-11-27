// Tests for the "Ready-made methods" gallery of the Payment methods tab (feature 32, backend B232), run through the whole app against the
// dev mock API: the eight entries, Add and Coming soon, the dialog filled from an entry and the `preset` it sends (and no code: the server
// makes it, with a number for a second method), the count on a card, a custom method with no preset, and the failures.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { listGateways } from '../api';
import { dialogOf, openSettings } from '../test/settingsPage';
import { recordRequests } from '../test/requests';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

/** The gallery section. */
const gallery = async () => within(await screen.findByRole('region', { name: 'Ready-made methods' }));

/** One entry of the gallery by its name (a list item: the cards of the saved methods are articles). */
const entry = async (name: string) => within(await (await gallery()).findByRole('listitem', { name }));

describe('the gallery', () => {
  it('shows the eight entries of the catalog in order, each with its name and a Manual or Automatic tag', async () => {
    await openSettings();
    const items = await (await gallery()).findAllByRole('listitem');
    expect(items.map((item) => within(item).getByRole('heading').textContent)).toEqual([
      'Bank transfer',
      'Crypto transfer',
      'Vodafone Cash',
      'Fawry',
      'InstaPay',
      'Binance Pay',
      'NOWPayments',
      'Binance Pay (automatic)',
    ]);
    expect((await gallery()).getAllByText('Manual')).toHaveLength(6);
    expect((await gallery()).getAllByText('Automatic')).toHaveLength(2);
  });

  it('puts the section above the saved methods, with its own heading for each', async () => {
    await openSettings();
    const section = await screen.findByRole('region', { name: 'Ready-made methods' });
    const saved = await screen.findByRole('heading', { name: 'Your payment methods' });
    expect(section.compareDocumentPosition(saved) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('gives an available entry an Add button, and an entry not built yet Coming soon with no Add', async () => {
    await openSettings();
    expect((await entry('Vodafone Cash')).getByRole('button', { name: 'Add Vodafone Cash' })).toBeEnabled();
    for (const name of ['NOWPayments', 'Binance Pay (automatic)']) {
      const soon = await entry(name);
      expect(soon.getByText('Coming soon')).toBeInTheDocument();
      expect(soon.queryByRole('button')).not.toBeInTheDocument();
    }
    expect((await gallery()).getAllByRole('button', { name: /^Add / })).toHaveLength(6);
  });

  it('says nothing about a count while no method was made from an entry', async () => {
    await openSettings();
    expect((await gallery()).queryByText(/ added$/)).not.toBeInTheDocument();
  });
});

describe('Add from an entry', () => {
  it('opens the dialog filled from the entry, sends preset, and counts the new method on the card', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings();
    await user.click((await entry('Vodafone Cash')).getByRole('button', { name: 'Add Vodafone Cash' }));
    const dialog = dialogOf('Add Vodafone Cash');
    expect(dialog.getByRole('textbox', { name: 'Name' })).toHaveValue('Vodafone Cash');
    // No Code box: the server makes the code from the entry's key.
    expect(dialog.queryByRole('textbox', { name: 'Code' })).not.toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: 'Driver' })).toHaveValue('vodafone_cash');
    expect(dialog.getByRole('checkbox', { name: 'A person checks each payment (manual)' })).toBeChecked();
    expect(dialog.getByRole('textbox', { name: 'Instructions' })).toHaveProperty(
      'value',
      expect.stringContaining('Vodafone Cash number ________'),
    );
    // It starts switched off: the instructions still have blanks.
    expect(dialog.getByRole('checkbox', { name: 'On (customers can pay with it)' })).not.toBeChecked();
    await user.type(dialog.getByRole('textbox', { name: 'Instructions' }), ' Number 0100.');
    await user.click(dialog.getByRole('button', { name: 'Add payment method' }));
    expect(await screen.findByText('Vodafone Cash added')).toBeInTheDocument();
    expect(recorder.to('POST', '/admin/payment-gateways')[0].body).not.toHaveProperty('code');
    expect(recorder.to('POST', '/admin/payment-gateways')[0].body).toMatchObject({
      preset: 'vodafone_cash',
      name: 'Vodafone Cash',
      driver: 'vodafone_cash',
      isManual: true,
      // Merchants and customers alike, unless staff choose otherwise.
      audience: 'both',
    });
    expect(await screen.findByRole('article', { name: 'Vodafone Cash' })).toBeInTheDocument();
    expect(await (await entry('Vodafone Cash')).findByText('1 added')).toBeInTheDocument();
    expect((await listGateways()).data.some((gateway) => gateway.code === 'vodafone_cash')).toBe(true);
    expect((await entry('InstaPay')).queryByText(/ added$/)).not.toBeInTheDocument();
  });

  it('lets the server make a free code for a second method from the same entry and counts both', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings();
    for (const code of ['bank_transfer', 'bank_transfer_2']) {
      await user.click((await entry('Bank transfer')).getByRole('button', { name: 'Add Bank transfer' }));
      const dialog = dialogOf('Add Bank transfer');
      expect(dialog.queryByRole('textbox', { name: 'Code' })).not.toBeInTheDocument();
      if (code === 'bank_transfer_2') await user.type(dialog.getByRole('textbox', { name: 'Name' }), ' B');
      await user.click(dialog.getByRole('button', { name: 'Add payment method' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      // The first Bank transfer of the demo is a custom method; the count must follow the preset, not the name.
      await (await entry('Bank transfer')).findByText(code === 'bank_transfer' ? '1 added' : '2 added');
    }
    const posts = recorder.to('POST', '/admin/payment-gateways');
    expect(posts.every((post) => !('code' in (post.body as object)))).toBe(true);
    expect(posts.every((post) => (post.body as { preset: string }).preset === 'bank_transfer')).toBe(true);
    const codes = (await listGateways()).data
      .filter((gateway) => gateway.preset === 'bank_transfer')
      .map((gateway) => gateway.code);
    expect(codes).toEqual(['bank_transfer', 'bank_transfer_2']);
  });

  it('fills the dialog from a crypto entry, sends nothing on Cancel, and has no way in for a coming-soon entry', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings();
    await user.click((await entry('Binance Pay')).getByRole('button', { name: 'Add Binance Pay' }));
    const dialog = dialogOf('Add Binance Pay');
    expect(dialog.getByRole('textbox', { name: 'Driver' })).toHaveValue('binance_pay');
    expect(dialog.getByRole('textbox', { name: 'Instructions' })).toHaveProperty(
      'value',
      expect.stringContaining('Pay ID'),
    );
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(recorder.to('POST', '/admin/payment-gateways')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Add NOWPayments' })).not.toBeInTheDocument();
  });

  it('shows the server’s refusal of the preset in the dialog and keeps it open', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/payment-gateways', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'preset', message: 'Vodafone Cash cannot be added yet.' },
        ]),
      ),
    );
    await openSettings();
    await user.click((await entry('Vodafone Cash')).getByRole('button', { name: 'Add Vodafone Cash' }));
    const dialog = dialogOf('Add Vodafone Cash');
    await user.click(dialog.getByRole('button', { name: 'Add payment method' }));
    // A field the form does not have shows in the dialog's error slot with its name in front, as for the other dialogs.
    expect(await dialog.findByText('preset: Vodafone Cash cannot be added yet.')).toBeInTheDocument();
    expect(screen.queryByText('Vodafone Cash added')).not.toBeInTheDocument();
  });
});

describe('Add custom method', () => {
  it('opens an empty dialog and sends no preset', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings();
    await user.click(await screen.findByRole('button', { name: 'Add custom method' }));
    const dialog = dialogOf('Add payment method');
    expect(dialog.getByRole('textbox', { name: 'Name' })).toHaveValue('');
    expect(dialog.getByRole('combobox', { name: 'Driver' })).toHaveValue('bank');
    expect(dialog.queryByRole('textbox', { name: 'Code' })).not.toBeInTheDocument();
    await user.type(dialog.getByRole('textbox', { name: 'Name' }), 'CliQ');
    await user.click(dialog.getByRole('button', { name: 'Add payment method' }));
    expect(await screen.findByText('CliQ added')).toBeInTheDocument();
    const body = recorder.to('POST', '/admin/payment-gateways')[0].body;
    expect(body).not.toHaveProperty('preset');
    expect(body).not.toHaveProperty('code');
    expect(body).toMatchObject({ name: 'CliQ', driver: 'bank' });
    expect((await listGateways()).data.at(-1)!.code).toBe('cliq');
    expect(await screen.findByRole('article', { name: 'CliQ' })).toBeInTheDocument();
  });
});

describe('when the catalog cannot be read', () => {
  it('says so with a Retry and leaves the saved methods in place', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/payment-gateway-presets', () =>
        problem(500, 'INTERNAL', 'Server error', 'The catalog is down.'),
      ),
    );
    await openSettings();
    expect(await screen.findByText('Could not load the ready-made methods')).toBeInTheDocument();
    expect(await screen.findByRole('article', { name: 'Card gateway' })).toBeInTheDocument();
    mockServer.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await (await gallery()).findByRole('listitem', { name: 'Fawry' })).toBeInTheDocument();
  });
});
