// Tests for the two ways the Services panel changes things, run through the whole app against the feature's mock API: the
// "Edit links…" editor (move, remove and add suppliers in a service's chain) and "Import services…" (pick, preview, import).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { mocks, suppliersState } from '../mocks';
import { detailOf, openSuppliers, toasts } from '../test/suppliersPage';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => mockServer.use(...mocks.handlers));

type User = ReturnType<typeof userEvent.setup>;

/** The row of the Services table that holds a service name. */
async function serviceRow(detail: ReturnType<typeof within>, supplier: string, name: string) {
  const table = within(await detail.findByRole('table', { name: `Services using ${supplier}` }));
  return within(table.getByText(name).closest('tr') as HTMLElement);
}

async function openLinks(user: User, detail: ReturnType<typeof within>, supplier: string, service: string) {
  await user.click(
    (await serviceRow(detail, supplier, service)).getByRole('button', { name: `Edit links of ${service}` }),
  );
  return within(await screen.findByRole('dialog', { name: `Supplier links for ${service}` }));
}

describe('edit links', () => {
  it('shows the chain of the service, and moving the fallback up makes it the primary', async () => {
    const user = userEvent.setup();
    await openSuppliers('/suppliers?supplier=3');
    const detail = await detailOf('Rapid IMEI');
    expect(
      (await serviceRow(detail, 'Rapid IMEI', 'iCloud Clean / Lost Check')).getByText('Primary'),
    ).toBeInTheDocument();

    const dialog = await openLinks(user, detail, 'Rapid IMEI', 'iCloud Clean / Lost Check');
    const chain = within(dialog.getByRole('list', { name: 'Suppliers in order' }));
    const items = chain.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('PrimaryRapid IMEIiCloud Clean / Lost Check');
    expect(items[1]).toHaveTextContent('FallbackNordic GSM');
    expect(chain.getByRole('button', { name: 'Move Rapid IMEI up' })).toBeDisabled();
    expect(chain.getByRole('button', { name: 'Move Nordic GSM down' })).toBeDisabled();

    await user.click(chain.getByRole('button', { name: 'Move Nordic GSM up' }));
    expect(chain.getAllByRole('listitem')[0]).toHaveTextContent('PrimaryNordic GSM');
    await user.click(dialog.getByRole('button', { name: 'Save links' }));

    expect(await toasts().findByText('Supplier links updated')).toBeInTheDocument();
    expect(
      toasts().getByText('iCloud Clean / Lost Check now uses 2 suppliers, in order.'),
    ).toBeInTheDocument();
    // Rapid IMEI is the fallback of that service now.
    await waitFor(async () =>
      expect(
        (await serviceRow(detail, 'Rapid IMEI', 'iCloud Clean / Lost Check')).getByText('Fallback'),
      ).toBeInTheDocument(),
    );
  });

  it('removes a supplier, adds another one with the service picked at it, and sends the chain in order', async () => {
    const user = userEvent.setup();
    let sent: unknown;
    mockServer.use(
      // A clone, so the body is still there for the mock route this handler passes the request on to.
      http.put('*/admin/services/:id/supplier-links', async ({ request }) => {
        sent = await request.clone().json();
        return undefined;
      }),
    );
    await openSuppliers('/suppliers?supplier=3');
    const detail = await detailOf('Rapid IMEI');
    const dialog = await openLinks(user, detail, 'Rapid IMEI', 'iCloud Clean / Lost Check');

    await user.click(dialog.getByRole('button', { name: 'Remove Nordic GSM' }));
    expect(
      within(dialog.getByRole('list', { name: 'Suppliers in order' })).queryByText('Nordic GSM'),
    ).not.toBeInTheDocument();
    // A supplier already in the chain is not offered again; a new one needs its service picked.
    const add = dialog.getByLabelText('Add a supplier');
    expect(within(add).queryByRole('option', { name: 'Rapid IMEI' })).not.toBeInTheDocument();
    await user.selectOptions(add, 'Gulf Server Hub');
    await user.click(dialog.getByRole('button', { name: 'Save links' }));
    expect(
      await dialog.findByText('Choose the service at Gulf Server Hub for the supplier you added.'),
    ).toBeInTheDocument();

    const picker = await dialog.findByLabelText('Service at Gulf Server Hub');
    await waitFor(() => expect(within(picker).getAllByRole('option').length).toBeGreaterThan(1));
    await user.selectOptions(picker, within(picker).getByRole('option', { name: /^Octoplus Credits x25/ }));
    expect(dialog.getAllByRole('listitem')[1]).toHaveTextContent(
      'FallbackGulf Server HubOctoplus Credits x25',
    );
    await user.click(dialog.getByRole('button', { name: 'Save links' }));

    expect(await toasts().findByText('Supplier links updated')).toBeInTheDocument();
    expect(sent).toMatchObject({ links: [{ priority: 1 }, { priority: 2 }] });
    const state = await suppliersState();
    const chain = state.links.filter((link) => link.serviceId === 1);
    expect(chain.map((link) => state.catalogue.find(link.supplierServiceId)?.supplierId)).toEqual([3, 2]);
  });

  it('says nothing changed when the chain is the same, and unlinks a service when every supplier is removed', async () => {
    const user = userEvent.setup();
    await openSuppliers('/suppliers?supplier=3');
    const detail = await detailOf('Rapid IMEI');
    const dialog = await openLinks(user, detail, 'Rapid IMEI', 'Blacklist Status (GSMA)');
    await user.click(dialog.getByRole('button', { name: 'Save links' }));
    expect(await toasts().findByText('Nothing changed')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /Supplier links for/ })).not.toBeInTheDocument(),
    );

    const again = await openLinks(user, detail, 'Rapid IMEI', 'Blacklist Status (GSMA)');
    await user.click(again.getByRole('button', { name: 'Remove Rapid IMEI' }));
    await user.click(again.getByRole('button', { name: 'Remove Nordic GSM' }));
    expect(
      again.getByText(/No supplier is linked\. Orders for this service wait for manual dispatch\./),
    ).toBeInTheDocument();
    await user.click(again.getByRole('button', { name: 'Save links' }));
    expect(
      await toasts().findByText(/has no supplier now\. Its orders wait for manual dispatch\./),
    ).toBeInTheDocument();
    await waitFor(async () =>
      expect(
        within(await detail.findByRole('table', { name: 'Services using Rapid IMEI' })).queryByText(
          'Blacklist Status (GSMA)',
        ),
      ).not.toBeInTheDocument(),
    );
  });

  it('shows the server’s refusal inside the dialog and keeps it open', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.put('*/admin/services/:id/supplier-links', () =>
        problem(
          409,
          'LINK_CONFLICT',
          'Cannot change the links',
          'Rapid IMEI still has orders on this service.',
        ),
      ),
    );
    await openSuppliers('/suppliers?supplier=3');
    const detail = await detailOf('Rapid IMEI');
    const dialog = await openLinks(user, detail, 'Rapid IMEI', 'iCloud Clean / Lost Check');
    await user.click(dialog.getByRole('button', { name: 'Move Nordic GSM up' }));
    await user.click(dialog.getByRole('button', { name: 'Save links' }));
    expect(await dialog.findByText('Rapid IMEI still has orders on this service.')).toBeInTheDocument();
    expect(
      screen.getByRole('dialog', { name: 'Supplier links for iCloud Clean / Lost Check' }),
    ).toBeInTheDocument();
  });
});

describe('import services', () => {
  /** The row of the picker that holds a service name. */
  const pickerRow = (dialog: ReturnType<typeof within>, name: string) =>
    within(dialog.getByText(name).closest('tr') as HTMLElement);

  async function openImport(user: User) {
    await openSuppliers();
    const detail = await detailOf('Nordic GSM');
    await user.click(await detail.findByRole('button', { name: 'Import services…' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Import services from Nordic GSM' }));
    await dialog.findByRole('table', { name: 'Supplier services' });
    return { detail, dialog };
  }

  it('lists the supplier’s own services, with a search and a filter for the ones not imported yet', async () => {
    const user = userEvent.setup();
    const { dialog } = await openImport(user);
    const table = within(dialog.getByRole('table', { name: 'Supplier services' }));
    expect(table.getAllByRole('row')).toHaveLength(18); // the header and 17 services
    expect(dialog.getByRole('button', { name: /^Preview/ })).toBeDisabled();
    expect(dialog.getByText('0 picked')).toBeInTheDocument();

    await user.click(dialog.getByRole('checkbox', { name: 'Only services not imported yet' }));
    await waitFor(() => expect(table.getAllByRole('row')).toHaveLength(4));
    await user.type(dialog.getByRole('searchbox', { name: "Search the supplier's services" }), 'telstra');
    await waitFor(() => expect(table.getAllByRole('row')).toHaveLength(2));
    expect(table.getByText('Telstra Australia Unlock')).toBeInTheDocument();
  });

  it('previews what would happen to the picked services, then imports them', async () => {
    const user = userEvent.setup();
    const { detail, dialog } = await openImport(user);
    await user.click(pickerRow(dialog, 'Sprint USA Premium Unlock').getByRole('checkbox'));
    await user.click(pickerRow(dialog, 'AT&T USA Premier Unlock').getByRole('checkbox'));
    await user.click(pickerRow(dialog, 'iCloud Clean / Lost Check').getByRole('checkbox'));
    expect(dialog.getByText('3 picked')).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Preview (3)' }));

    const preview = within(await dialog.findByRole('table', { name: 'Import preview' }));
    expect(dialog.getByText('1 new, 1 with a changed cost, 1 already match.')).toBeInTheDocument();
    const rows = Object.fromEntries(
      ['Sprint USA Premium Unlock', 'AT&T USA Premier Unlock', 'iCloud Clean / Lost Check'].map((name) => [
        name,
        within(preview.getByText(name).closest('tr') as HTMLElement),
      ]),
    );
    expect(rows['Sprint USA Premium Unlock'].getByText('New')).toBeInTheDocument();
    expect(rows['Sprint USA Premium Unlock'].getByText('$4.00')).toBeInTheDocument(); // suggested price
    expect(rows['AT&T USA Premier Unlock'].getByText('Matches')).toBeInTheDocument();
    expect(rows['iCloud Clean / Lost Check'].getByText('Cost changed')).toBeInTheDocument();
    expect(rows['iCloud Clean / Lost Check'].getByText(/^was \$/)).toBeInTheDocument();

    // Back keeps the picks; the import sends the new and the changed one, not the one that already matches.
    await user.click(dialog.getByRole('button', { name: 'Back' }));
    expect(await dialog.findByText('3 picked')).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Preview (3)' }));
    await dialog.findByRole('table', { name: 'Import preview' });
    await user.click(dialog.getByRole('button', { name: 'Import 2 services' }));

    expect(await toasts().findByText('2 services imported')).toBeInTheDocument();
    expect(toasts().getByText('1 new, 1 updated')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /Import services from/ })).not.toBeInTheDocument(),
    );
    const table = within(await detail.findByRole('table', { name: 'Services using Nordic GSM' }));
    await waitFor(() => expect(table.getAllByRole('row')).toHaveLength(16));
    expect(table.getByText('Sprint USA Premium Unlock')).toBeInTheDocument();
  });

  it('has nothing to import when every picked service already matches', async () => {
    const user = userEvent.setup();
    const { dialog } = await openImport(user);
    await user.click(pickerRow(dialog, 'AT&T USA Premier Unlock').getByRole('checkbox'));
    await user.click(dialog.getByRole('button', { name: 'Preview (1)' }));
    await dialog.findByRole('table', { name: 'Import preview' });
    expect(dialog.getByRole('button', { name: 'Nothing to import' })).toBeDisabled();
  });

  it('shows the server’s refusal of a preview inside the dialog', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/suppliers/:id/import/preview', () =>
        problem(
          409,
          'SYNC_NEEDED',
          'Sync first',
          'The service list is older than a day. Sync Nordic GSM first.',
        ),
      ),
    );
    const { dialog } = await openImport(user);
    await user.click(pickerRow(dialog, 'Sprint USA Premium Unlock').getByRole('checkbox'));
    await user.click(dialog.getByRole('button', { name: 'Preview (1)' }));
    expect(
      await dialog.findByText('The service list is older than a day. Sync Nordic GSM first.'),
    ).toBeInTheDocument();
    expect(dialog.queryByRole('table', { name: 'Import preview' })).not.toBeInTheDocument();
  });

  it('says to sync a supplier that has no services yet', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/suppliers/:id/services', () =>
        HttpResponse.json([], { headers: { 'x-total-count': '0' } }),
      ),
    );
    await openSuppliers();
    const detail = await detailOf('Nordic GSM');
    await user.click(await detail.findByRole('button', { name: 'Import services…' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Import services from Nordic GSM' }));
    expect(await dialog.findByText('Sync the supplier to copy its service list.')).toBeInTheDocument();
  });
});
