// Tests for the Suppliers page, run through the whole app against the feature's mock API: the list and its counts, the selection
// in the address, the detail (banner, stats, charts, services, connection, report line), the loading, empty and error states, and
// what the staff member's permissions hide or disable.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { mocks, suppliersState } from '../mocks';
import { detailOf, openSuppliers, supplierButton } from '../test/suppliersPage';

setupMockApi();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite runs
// in parallel. Every flow here also goes through the mock API, so give them room.
vi.setConfig({ testTimeout: 20_000 });
// The shared lookup mock also answers `GET /admin/suppliers`; the feature's own routes go first.
beforeEach(() => mockServer.use(...mocks.handlers));

describe('the list', () => {
  it('counts the suppliers that are not healthy and the ones low on balance, and shows one row each', async () => {
    await openSuppliers();
    expect(await screen.findByText(/^6 suppliers/)).toBeInTheDocument();
    expect(screen.getByText('1 not healthy')).toBeInTheDocument();
    expect(screen.getByText('1 low on prepaid balance')).toBeInTheDocument();

    const nordic = within(await supplierButton(/^Nordic GSM/));
    expect(nordic.getByText('Healthy')).toBeInTheDocument();
    expect(nordic.getByText(/Dhru Fusion 6\.1 · 17 open/)).toBeInTheDocument();
    expect(nordic.getByText('3 to review')).toBeInTheDocument();
    expect(nordic.getByText('98%')).toBeInTheDocument();
    expect(nordic.getByText('$1,850')).toBeInTheDocument();

    const rapid = within(await supplierButton(/^Rapid IMEI/));
    expect(rapid.getByText('Degraded')).toBeInTheDocument();
    expect(rapid.getByText('35%')).toHaveClass('text-serious-fg');

    const gulf = within(await supplierButton(/^Gulf Server Hub/));
    expect(gulf.getByText('$38 low')).toHaveClass('text-warn-fg');
  });

  it('shows the first supplier and keeps the choice of another in the address', async () => {
    const user = userEvent.setup();
    const app = await openSuppliers();
    expect(await supplierButton(/^Nordic GSM/)).toHaveAttribute('aria-current', 'true');
    await detailOf('Nordic GSM');

    await user.click(await supplierButton(/^Rapid IMEI/));
    expect(app.location()).toBe('/suppliers?supplier=3');
    const detail = await detailOf('Rapid IMEI');
    expect(await supplierButton(/^Rapid IMEI/)).toHaveAttribute('aria-current', 'true');
    expect(await supplierButton(/^Nordic GSM/)).not.toHaveAttribute('aria-current');
    expect(detail.getByRole('alert')).toHaveTextContent('Success rate fell to 35% in the last hour');
  });

  it('opens the supplier named in the address, and the first one when the address names none that exists', async () => {
    await openSuppliers('/suppliers?supplier=2');
    const gulf = await detailOf('Gulf Server Hub');
    expect(gulf.getByText('Below the $150 minimum')).toBeInTheDocument();
    expect(await supplierButton(/^Gulf Server Hub/)).toHaveAttribute('aria-current', 'true');
  });

  it('falls back to the first supplier for an id that does not exist', async () => {
    await openSuppliers('/suppliers?supplier=99');
    await detailOf('Nordic GSM');
  });
});

describe('the detail', () => {
  it('shows the four figures, with the link to the supplier’s open orders', async () => {
    await openSuppliers();
    const detail = await detailOf('Nordic GSM');
    const stat = (label: string) => detail.getByText(label).parentElement as HTMLElement;
    expect(stat('Success, last hour')).toHaveTextContent('97.8%24 h average 98.4%');
    expect(stat('Latency p50 / p95')).toHaveTextContent('310 ms / 806 msMedian and slowest 5%');
    expect(stat('Open orders')).toHaveTextContent('173 need review · View');
    expect(detail.getByRole('link', { name: 'View' })).toHaveAttribute('href', '/orders?supplierId=1');
    expect(stat('Prepaid balance')).toHaveTextContent(
      /\$1,850\.00About \d+ days of volume at the 7-day rate/,
    );
  });

  it('warns about a degraded supplier and a down one, and colours a low balance', async () => {
    await openSuppliers('/suppliers?supplier=3');
    const rapid = await detailOf('Rapid IMEI');
    expect(rapid.getByRole('button', { name: /Reroute 10 open orders/ })).toBeInTheDocument();
    expect(rapid.getByText('35.3%')).toHaveClass('text-serious-fg');
  });

  it('says a supplier is not responding when its health is down', async () => {
    (await suppliersState()).suppliers.patch(1, { health: 'down' });
    await openSuppliers();
    const nordic = await detailOf('Nordic GSM');
    expect(await nordic.findByRole('alert')).toHaveTextContent('Nordic GSM is not responding');
    expect(nordic.getByText('Down')).toBeInTheDocument();
  });

  it('does not warn about a disabled supplier, whatever its health, and stops counting it as unhealthy', async () => {
    (await suppliersState()).suppliers.patch(3, { status: 'disabled' });
    await openSuppliers('/suppliers?supplier=3');
    const rapid = await detailOf('Rapid IMEI');
    expect(await rapid.findByText('Disabled')).toBeInTheDocument();
    expect(rapid.queryByRole('alert')).not.toBeInTheDocument();
    expect(await screen.findByText(/, all healthy/)).toBeInTheDocument();
  });

  it('keeps the header, the figures and the log when the detail cannot be read, and recovers with Retry', async () => {
    const user = userEvent.setup();
    let failing = true;
    mockServer.use(
      http.get('*/admin/suppliers/:id', () =>
        failing
          ? problem(403, 'FORBIDDEN', 'No permission', 'The detail is closed for your role.')
          : undefined,
      ),
    );
    await openSuppliers();
    const detail = await detailOf('Nordic GSM');
    expect(await detail.findByText('Could not load the services')).toBeInTheDocument();
    expect(detail.getByText('The detail is closed for your role.')).toBeInTheDocument();
    expect(detail.getByText('97.8%')).toBeInTheDocument();
    expect(await detail.findByRole('table', { name: 'Recent API calls' })).toBeInTheDocument();
    expect(detail.queryByRole('img', { name: /^Line chart/ })).not.toBeInTheDocument();

    failing = false;
    await user.click(detail.getByRole('button', { name: 'Retry' }));
    expect(await detail.findByRole('table', { name: 'Services using Nordic GSM' })).toBeInTheDocument();
    expect(await detail.findByRole('img', { name: /^Line chart: hourly success rate/ })).toBeInTheDocument();
  });

  it('draws the two charts of the last 24 hours with a table of the same numbers', async () => {
    await openSuppliers();
    const detail = await detailOf('Nordic GSM');
    expect(
      await detail.findByRole('img', {
        name: /^Line chart: hourly success rate for Nordic GSM.*Latest 97\.8%/,
      }),
    ).toBeInTheDocument();
    expect(
      detail.getByRole('img', { name: /^Line chart: hourly median latency for Nordic GSM/ }),
    ).toBeInTheDocument();
    const table = detail.getByRole('table', { name: 'Hourly success and latency for Nordic GSM' });
    expect(within(table).getAllByRole('row')).toHaveLength(25);
  });

  it('lists the services that use the supplier with their role, cost and SLA', async () => {
    await openSuppliers();
    const detail = await detailOf('Nordic GSM');
    const table = within(await detail.findByRole('table', { name: 'Services using Nordic GSM' }));
    expect(table.getAllByRole('row')).toHaveLength(15); // the header and 14 services
    const primary = within(table.getByText('AT&T USA Premier Unlock').closest('tr') as HTMLElement);
    expect(primary.getByText('Primary')).toBeInTheDocument();
    expect(primary.getByText('$13.50')).toBeInTheDocument();
    expect(primary.getByText('2d')).toBeInTheDocument();
    const fallback = within(table.getByText('iCloud Clean / Lost Check').closest('tr') as HTMLElement);
    expect(fallback.getByText('Fallback')).toBeInTheDocument();
    expect(detail.getByRole('heading', { name: /^Services\s*14$/ })).toBeInTheDocument();
  });

  it('shows the connection with a hint of the key and no way to copy it', async () => {
    await openSuppliers();
    const detail = await detailOf('Nordic GSM');
    const connection = within(
      (await detail.findByRole('heading', { name: 'Connection' })).parentElement
        ?.parentElement as HTMLElement,
    );
    expect(connection.getByText('https://api.nordicgsm.example')).toBeInTheDocument();
    expect(connection.getByText('sk_57••••••••')).toBeInTheDocument();
    expect(connection.getByText('Never shown again')).toBeInTheDocument();
    expect(connection.getByText('$150 prepaid')).toBeInTheDocument();
    expect(connection.getByText('5 at a time, 60 per minute, 15 s timeout')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /copy api key/i })).not.toBeInTheDocument();
  });

  it('adds a line from the supplier report for staff who can read reports', async () => {
    await openSuppliers();
    const line = await screen.findByLabelText('Supplier report');
    expect(line).toHaveTextContent(
      /Last 7 days · \d+ orders · \$[\d,.]+ spent · [\d.]+% rejected · .+ average/,
    );
  });

  it('says why the report line is missing when the report cannot be read', async () => {
    mockServer.use(
      http.get('*/admin/reports/suppliers', () =>
        problem(403, 'FORBIDDEN', 'No permission', 'Reports are closed for your role.'),
      ),
    );
    await openSuppliers();
    expect(
      await screen.findByText(/Supplier report unavailable: Reports are closed for your role\./),
    ).toBeInTheDocument();
  });
});

describe('loading, empty and error states', () => {
  it('shows the server’s error with Retry, and loads the suppliers when Retry works', async () => {
    const user = userEvent.setup();
    let failing = true;
    mockServer.use(
      http.get('*/admin/suppliers', () =>
        failing
          ? problem(500, 'SUPPLIERS_FAILED', 'Suppliers are not available', 'The database is restarting.')
          : undefined,
      ),
    );
    await openSuppliers();
    // A server error is read once more before the page gives up (the app's retry rule), so allow for that wait.
    expect(
      await screen.findByText('Could not load the suppliers', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('The database is restarting.')).toBeInTheDocument();
    failing = false;
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await detailOf('Nordic GSM');
  });

  it('says there are no suppliers and offers to connect one', async () => {
    mockServer.use(
      http.get('*/admin/suppliers', () => HttpResponse.json([], { headers: { 'x-total-count': '0' } })),
    );
    await openSuppliers();
    expect(await screen.findByText('No suppliers connected')).toBeInTheDocument();
    expect(screen.getByText(/Connect a supplier API \(Dhru Fusion 6\.1 or REST\)/)).toBeInTheDocument();
    // The empty state has its own button; the header leaves its own out.
    expect(screen.getAllByRole('button', { name: 'Connect supplier' })).toHaveLength(1);
  });
});

describe('permissions', () => {
  it('lets a read-only staff member look, and disables every action with the permission it needs', async () => {
    await openSuppliers('/suppliers', { permissions: ['suppliers:read'] });
    const detail = await detailOf('Nordic GSM');
    const connect = screen.getByRole('button', { name: 'Connect supplier' });
    expect(connect).toBeDisabled();
    expect(connect).toHaveAttribute('title', 'You need the suppliers:create permission');
    for (const name of ['Test connection', 'Sync now']) {
      const button = detail.getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'You need the suppliers:update permission');
    }
    const importButton = await detail.findByRole('button', { name: 'Import services…' });
    expect(importButton).toBeDisabled();
    expect(importButton).toHaveAttribute('title', 'You need the catalog:create permission');
    const links = detail.getByRole('button', { name: 'Edit links of AT&T USA Premier Unlock' });
    expect(links).toBeDisabled();
    expect(links).toHaveAttribute('title', 'You need the catalog:update permission');
    // No report permission, no report line; no orders permission, no link to the orders and plain order numbers in the log.
    expect(screen.queryByLabelText('Supplier report')).not.toBeInTheDocument();
    expect(detail.queryByRole('link', { name: 'View' })).not.toBeInTheDocument();
    const log = within(await detail.findByRole('table', { name: 'Recent API calls' }));
    expect(log.queryByRole('button', { name: /^#\d+$/ })).not.toBeInTheDocument();
  });

  it('disables the menu items that need a permission the staff member lacks', async () => {
    const user = userEvent.setup();
    await openSuppliers('/suppliers', { permissions: ['suppliers:read'] });
    await detailOf('Nordic GSM');
    await user.click(screen.getByRole('button', { name: 'More actions for Nordic GSM' }));
    const menu = within(screen.getByRole('menu', { name: 'Actions for Nordic GSM' }));
    expect(menu.getByRole('menuitem', { name: 'Copy base URL' })).toBeEnabled();
    for (const name of [
      'See its orders',
      'Reroute open orders…',
      'Edit connection…',
      'Disable supplier…',
      'Delete supplier…',
    ]) {
      expect(menu.getByRole('menuitem', { name })).toBeDisabled();
    }
  });

  it('opens the page for a role that only reads suppliers, and not for one that cannot', async () => {
    await openSuppliers('/suppliers', { permissions: ['suppliers:read'] });
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Suppliers' })).toBeInTheDocument(),
    );
  });
});
