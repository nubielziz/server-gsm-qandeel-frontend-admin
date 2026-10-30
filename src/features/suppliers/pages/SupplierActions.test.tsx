// Tests for the actions on one supplier, run through the whole app against the feature's mock API: connecting a supplier and
// testing it (with the failure text of a degraded one), Sync now and the server's refusal, Disable and Enable, editing the
// connection, deleting, and the items of the "⋯" menu.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { createSupplier } from '../api';
import { mocks, suppliersState } from '../mocks';
import { detailOf, openSuppliers, supplierButton, toasts } from '../test/suppliersPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
beforeEach(() => mockServer.use(...mocks.handlers));

type User = ReturnType<typeof userEvent.setup>;

const NEW_SUPPLIER = {
  name: 'Atlas IMEI',
  driver: 'dhru',
  baseUrl: 'https://api.atlasimei.example',
  username: 'gsm-supply',
  apiKey: 'sk_atlas_secret',
  currency: 'USD',
};

async function openMenu(user: User, name: string) {
  await user.click(await screen.findByRole('button', { name: `More actions for ${name}` }));
  return within(await screen.findByRole('menu', { name: `Actions for ${name}` }));
}

async function fillConnect(user: User, dialog: ReturnType<typeof within>, values: Record<string, string>) {
  for (const [label, value] of Object.entries(values)) {
    await user.clear(dialog.getByLabelText(label));
    await user.type(dialog.getByLabelText(label), value);
  }
}

describe('connect supplier', () => {
  it('checks the form first, then connects the supplier, selects it and offers to test the connection', async () => {
    const user = userEvent.setup();
    const app = await openSuppliers();
    await user.click(await screen.findByRole('button', { name: 'Connect supplier' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Connect supplier' }));

    await user.click(dialog.getByRole('button', { name: 'Connect' }));
    expect(await dialog.findByText('Enter a supplier name.')).toBeInTheDocument();
    expect(dialog.getByText('Enter a valid URL, like https://api.example.com.')).toBeInTheDocument();
    expect(dialog.getByText('Enter the API key.')).toBeInTheDocument();

    await fillConnect(user, dialog, {
      Name: 'Atlas IMEI',
      'Base URL': 'https://api.atlasimei.example',
      Username: 'gsm-supply',
      'API key': 'sk_atlas_secret',
    });
    await user.click(dialog.getByRole('button', { name: 'Connect' }));

    expect(await screen.findByText('Atlas IMEI connected')).toBeInTheDocument();
    await waitFor(() => expect(app.location()).toBe('/suppliers?supplier=7'));
    const detail = await detailOf('Atlas IMEI');
    expect(await detail.findByText('No services use this supplier')).toBeInTheDocument();
    // A supplier with no hourly history gets no charts, and its empty services panel offers the import.
    expect(detail.queryByRole('img', { name: /^Line chart/ })).not.toBeInTheDocument();
    expect(detail.getByRole('button', { name: 'Import services…' })).toBeInTheDocument();
    expect(detail.getByText('sk_at••••••••')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Connect supplier' })).not.toBeInTheDocument();

    // The toast's own button tests the new connection.
    await user.click(toasts().getByRole('button', { name: 'Test connection' }));
    expect(await toasts().findByText('Atlas IMEI is reachable')).toBeInTheDocument();
    expect(toasts().getByText(/Authenticated as GSM Supply\./)).toBeInTheDocument();
  });

  it('puts the server’s complaint under the field it names and keeps the dialog open', async () => {
    const user = userEvent.setup();
    await openSuppliers();
    await user.click(await screen.findByRole('button', { name: 'Connect supplier' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Connect supplier' }));
    await fillConnect(user, dialog, {
      Name: 'nordic gsm',
      'Base URL': 'https://api.other.example',
      'API key': 'sk_other',
    });
    await user.click(dialog.getByRole('button', { name: 'Connect' }));
    expect(await dialog.findByText('A supplier with this name already exists.')).toBeInTheDocument();
    expect(dialog.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('dialog', { name: 'Connect supplier' })).toBeInTheDocument();
  });
});

describe('test connection', () => {
  it('says who the supplier authenticated and how fast it answered', async () => {
    const user = userEvent.setup();
    await openSuppliers();
    const detail = await detailOf('Nordic GSM');
    await user.click(detail.getByRole('button', { name: 'Test connection' }));
    expect(await screen.findByText('Nordic GSM is reachable')).toBeInTheDocument();
    expect(
      screen.getByText('Authenticated as GSM Supply. Balance $1,850.00. Answered in 310 ms.'),
    ).toBeInTheDocument();
  });

  it('shows the failure text of a supplier that does not answer, and the call appears in the API log', async () => {
    const user = userEvent.setup();
    await openSuppliers('/suppliers?supplier=3');
    const detail = await detailOf('Rapid IMEI');
    const log = within(await detail.findByRole('table', { name: 'Recent API calls' }));
    const before = log.getAllByRole('row').length;
    await user.click(detail.getByRole('button', { name: 'Test connection' }));
    expect(await toasts().findByText('Rapid IMEI failed the connection test')).toBeInTheDocument();
    expect(
      toasts().getByText(
        /accountinfo returned 504 \(gateway timeout\)\. Orders sent now may stop for review\./,
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(log.getAllByRole('row').length).toBe(Math.min(before + 1, 26)));
    expect(within(log.getAllByRole('row')[1]).getByText('504')).toBeInTheDocument();
  });

  it('shows an error response from the test as the server worded it', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/suppliers/:id/test', () =>
        problem(
          502,
          'SUPPLIER_UNREACHABLE',
          'Supplier unreachable',
          'Nordic GSM did not answer within 15 s.',
        ),
      ),
    );
    await openSuppliers();
    await user.click((await detailOf('Nordic GSM')).getByRole('button', { name: 'Test connection' }));
    expect(await screen.findByText('Supplier unreachable')).toBeInTheDocument();
    expect(screen.getByText(/Nordic GSM did not answer within 15 s\./)).toBeInTheDocument();
  });
});

describe('sync now', () => {
  it('syncs the services and the balance, and the last sync reads "just now"', async () => {
    const user = userEvent.setup();
    await openSuppliers();
    const detail = await detailOf('Nordic GSM');
    expect(detail.getByText('4m ago')).toBeInTheDocument();
    await user.click(detail.getByRole('button', { name: 'Sync now' }));
    expect(await screen.findByText('17 services checked')).toBeInTheDocument();
    expect(screen.getByText('1 with a changed cost. Balance $1,850.00.')).toBeInTheDocument();
    expect(await detail.findByText('just now')).toBeInTheDocument();
  });

  it('shows the server’s refusal when the supplier is disabled', async () => {
    const user = userEvent.setup();
    (await suppliersState()).suppliers.patch(1, { status: 'disabled' });
    await openSuppliers();
    await user.click((await detailOf('Nordic GSM')).getByRole('button', { name: 'Sync now' }));
    expect(await screen.findByText('Nordic GSM is disabled')).toBeInTheDocument();
    expect(screen.getByText(/Enable the supplier before syncing it\./)).toBeInTheDocument();
  });

  it('shows the server’s refusal when the supplier is down', async () => {
    const user = userEvent.setup();
    (await suppliersState()).suppliers.patch(3, { health: 'down' });
    await openSuppliers('/suppliers?supplier=3');
    await user.click((await detailOf('Rapid IMEI')).getByRole('button', { name: 'Sync now' }));
    expect(await screen.findByText('Can’t sync while Rapid IMEI is down')).toBeInTheDocument();
    expect(screen.getByText(/Try again once it recovers\./)).toBeInTheDocument();
  });
});

describe('disable and enable', () => {
  it('reviews what disabling does, then disables the supplier, and enables it again', async () => {
    const user = userEvent.setup();
    await openSuppliers('/suppliers?supplier=2');
    await detailOf('Gulf Server Hub');
    await user.click(
      (await openMenu(user, 'Gulf Server Hub')).getByRole('menuitem', { name: 'Disable supplier…' }),
    );

    const dialog = within(await screen.findByRole('dialog', { name: 'Disable Gulf Server Hub?' }));
    expect(
      dialog.getByText(/New orders for its 5 services go to their fallback supplier\./),
    ).toBeInTheDocument();
    expect(dialog.getByText('5 of them have no fallback')).toHaveClass('text-crit-fg');
    expect(dialog.getByText(/Open orders keep their current supplier\./)).toBeInTheDocument();

    // Cancel changes nothing.
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(within(await supplierButton(/^Gulf Server Hub/)).getByText('Healthy')).toBeInTheDocument();

    await user.click(
      (await openMenu(user, 'Gulf Server Hub')).getByRole('menuitem', { name: 'Disable supplier…' }),
    );
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Disable Gulf Server Hub?' })).getByRole('button', {
        name: 'Disable supplier',
      }),
    );
    expect(await screen.findByText('Gulf Server Hub disabled')).toBeInTheDocument();
    expect(screen.getByText('No new orders will be sent to it.')).toBeInTheDocument();
    expect(await within(await supplierButton(/^Gulf Server Hub/)).findByText('Disabled')).toBeInTheDocument();
    const detail = await detailOf('Gulf Server Hub');
    expect(await detail.findByText('Disabled')).toBeInTheDocument();

    await user.click(
      (await openMenu(user, 'Gulf Server Hub')).getByRole('menuitem', { name: 'Enable supplier' }),
    );
    expect(await screen.findByText('Gulf Server Hub enabled')).toBeInTheDocument();
    expect(await within(await supplierButton(/^Gulf Server Hub/)).findByText('Healthy')).toBeInTheDocument();
  });

  it('shows the server’s refusal inside the dialog and keeps it open', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/suppliers/:id', () =>
        problem(
          409,
          'LAST_SUPPLIER',
          'Cannot disable',
          'It is the only supplier of 5 services without a fallback.',
        ),
      ),
    );
    await openSuppliers('/suppliers?supplier=2');
    await detailOf('Gulf Server Hub');
    await user.click(
      (await openMenu(user, 'Gulf Server Hub')).getByRole('menuitem', { name: 'Disable supplier…' }),
    );
    const dialog = within(await screen.findByRole('dialog', { name: 'Disable Gulf Server Hub?' }));
    await user.click(dialog.getByRole('button', { name: 'Disable supplier' }));
    expect(
      await dialog.findByText('It is the only supplier of 5 services without a fallback.'),
    ).toBeInTheDocument();
    expect(within(await supplierButton(/^Gulf Server Hub/)).getByText('Healthy')).toBeInTheDocument();
  });
});

describe('edit connection', () => {
  it('says nothing changed when nothing did, then saves the fields that changed', async () => {
    const user = userEvent.setup();
    await openSuppliers();
    await detailOf('Nordic GSM');
    await user.click(
      (await openMenu(user, 'Nordic GSM')).getByRole('menuitem', { name: 'Edit connection…' }),
    );
    const dialog = within(await screen.findByRole('dialog', { name: 'Edit Nordic GSM' }));
    expect(dialog.getByLabelText('Base URL')).toHaveValue('https://api.nordicgsm.example');
    expect(dialog.getByLabelText('API key')).toHaveValue('');

    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit Nordic GSM' })).not.toBeInTheDocument(),
    );

    await user.click(
      (await openMenu(user, 'Nordic GSM')).getByRole('menuitem', { name: 'Edit connection…' }),
    );
    const again = within(await screen.findByRole('dialog', { name: 'Edit Nordic GSM' }));
    await user.clear(again.getByLabelText('Base URL'));
    await user.type(again.getByLabelText('Base URL'), 'https://api.nordic.example');
    await user.type(again.getByLabelText('API key'), 'zz_newkey');
    await user.click(again.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Connection updated')).toBeInTheDocument();
    expect(screen.getByText('base URL, API key changed.')).toBeInTheDocument();
    const detail = await detailOf('Nordic GSM');
    expect(await detail.findByText('https://api.nordic.example')).toBeInTheDocument();
    expect(detail.getByText('zz_ne••••••••')).toBeInTheDocument();
  });
});

describe('delete supplier', () => {
  it('shows the server’s refusal for a supplier in use', async () => {
    const user = userEvent.setup();
    await openSuppliers();
    await detailOf('Nordic GSM');
    await user.click(
      (await openMenu(user, 'Nordic GSM')).getByRole('menuitem', { name: 'Delete supplier…' }),
    );
    const dialog = within(await screen.findByRole('dialog', { name: 'Delete Nordic GSM?' }));
    await user.click(dialog.getByRole('button', { name: 'Delete supplier' }));
    expect(await dialog.findByText(/open orders and 14 linked services/)).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Delete Nordic GSM?' })).toBeInTheDocument();
  });

  it('deletes a supplier that nothing uses, and goes back to the first one', async () => {
    const user = userEvent.setup();
    await signInAs();
    const created = await createSupplier(NEW_SUPPLIER);
    const app = await openSuppliers(`/suppliers?supplier=${created.id}`);
    await detailOf('Atlas IMEI');
    await user.click(
      (await openMenu(user, 'Atlas IMEI')).getByRole('menuitem', { name: 'Delete supplier…' }),
    );
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Delete Atlas IMEI?' })).getByRole('button', {
        name: 'Delete supplier',
      }),
    );
    expect(await screen.findByText('Atlas IMEI deleted')).toBeInTheDocument();
    await detailOf('Nordic GSM');
    await waitFor(() => expect(app.location()).toBe('/suppliers'));
    expect(screen.queryByRole('button', { name: /^Atlas IMEI/ })).not.toBeInTheDocument();
  });
});

describe('the menu', () => {
  it('copies the base URL', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    await openSuppliers();
    await detailOf('Nordic GSM');
    await user.click((await openMenu(user, 'Nordic GSM')).getByRole('menuitem', { name: 'Copy base URL' }));
    expect(writeText).toHaveBeenCalledWith('https://api.nordicgsm.example');
    expect(await screen.findByText('Copied base URL')).toBeInTheDocument();
  });

  it('opens the supplier’s orders on the Orders page', async () => {
    const user = userEvent.setup();
    const app = await openSuppliers();
    await detailOf('Nordic GSM');
    await user.click((await openMenu(user, 'Nordic GSM')).getByRole('menuitem', { name: 'See its orders' }));
    await waitFor(() => expect(app.location()).toBe('/orders?tab=all&supplierId=1'));
  });
});
