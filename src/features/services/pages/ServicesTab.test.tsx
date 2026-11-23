// Tests for the Catalog table through the whole app against the dev mock API: the header sentence, the chips with the server's counts, the
// columns, badges and the name that names a service in the address, paging and sorting on the server, the filters (every one visible and
// removable), what a role without the shop permission gets, and the empty states.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { roleStore } from '@/mocks/roles';
import { setupMockApi } from '@/test/renderApp';
import { openServices, serviceRow, servicesTable } from '../test/servicesPage';

setupMockApi();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite
// runs in parallel. Every flow here also goes through the mock API, so give them room.
vi.setConfig({ testTimeout: 30_000 });

/** The query part of the address, without the `?`: the tests compare only the query, so they hold at the table's old or new path. */
const queryOf = (location: string | null) => (location ?? '').split('?')[1] ?? '';

/** Gives the seeded owner exactly these permissions on the mock server, which leaves out the keys and refuses the filters it may not read. */
const serverGrants = (permissions: string[]) => roleStore().patch(1, { permissions });

/** The chip strip above the table, and each chip's text with its count ("Needs attention4"). */
const chipStrip = () => within(screen.getByRole('tablist', { name: 'Service lists' }));
const chipTexts = () =>
  chipStrip()
    .getAllByRole('tab')
    .map((tab) => tab.textContent);

describe('header and chips', () => {
  it('says how many active services are under their floor, from the server’s count', async () => {
    await openServices();
    expect(
      await screen.findByText('1 service is priced below cost plus minimum profit.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Orders are charged the floor price until you update it\./)).toBeInTheDocument();
  });

  it('shows the four lists with the server’s counts, All first', async () => {
    await openServices();
    await waitFor(() =>
      expect(chipTexts()).toEqual(['All27', 'Needs attention4', 'Not on the shop9', 'Switched off1']),
    );
    expect(chipStrip().getByRole('tab', { name: /^All/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('opens a list from its chip, keeps it in the address and goes back to All', async () => {
    const user = userEvent.setup();
    const app = await openServices();
    await screen.findByText('27 services');
    await user.click(chipStrip().getByRole('tab', { name: /^Needs attention/ }));
    expect(queryOf(app.location())).toBe('chip=attention');
    expect(await screen.findByText('4 services')).toBeInTheDocument();
    expect(await serviceRow('Chimera Tool 1 Month')).toBeTruthy();

    await user.click(chipStrip().getByRole('tab', { name: /^Not on the shop/ }));
    expect(queryOf(app.location())).toBe('chip=notonshop');
    expect(await screen.findByText('9 services')).toBeInTheDocument();

    await user.click(chipStrip().getByRole('tab', { name: /^All/ }));
    expect(queryOf(app.location())).toBe('');
    expect(await screen.findByText('27 services')).toBeInTheDocument();
  });

  it('reads an old status=disabled as the Switched off list', async () => {
    await openServices('/catalog?status=disabled');
    expect(await screen.findByText('1 service')).toBeInTheDocument();
    expect(chipStrip().getByRole('tab', { name: /^Switched off/ })).toHaveAttribute('aria-selected', 'true');
    const row = await serviceRow('Xiaomi Mi Account Clean');
    expect(row.getByRole('switch', { name: 'Enable Xiaomi Mi Account Clean' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });
});

describe('the table', () => {
  it('has the Catalog columns, SLA and Auto gone', async () => {
    await openServices();
    const headers = (await servicesTable()).getAllByRole('columnheader').map((cell) => cell.textContent);
    for (const name of [
      'Service',
      'Type',
      'Supplier and cost',
      'Merchant price',
      'Shop price',
      'On shop',
      'Enabled',
    ]) {
      expect(headers).toContain(name);
    }
    expect(headers).not.toContain('SLA');
    expect(headers).not.toContain('Auto');
  });

  it('shows a service with its code, category, type, supplier, cost, merchant price, margin and typed shop price', async () => {
    await openServices();
    const row = await serviceRow('AT&T USA Premier Unlock');
    expect(row.getByText('IMEI-ATT-USA')).toBeInTheDocument();
    expect(row.getByText('Carrier unlock')).toBeInTheDocument();
    expect(row.getByText('IMEI')).toBeInTheDocument();
    expect(row.getByText('Nordic GSM')).toBeInTheDocument();
    expect(row.getByText('Cost $13.50')).toBeInTheDocument();
    expect(row.getByText('$17.28')).toBeInTheDocument();
    expect(row.getByText('21.9%')).toBeInTheDocument();
    expect(row.getByText('$25.99')).toBeInTheDocument();
    expect(row.getByText('Typed')).toBeInTheDocument();
    expect(row.getByRole('switch', { name: 'AT&T USA Premier Unlock on the shop' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(row.getByText('On the shop')).toBeInTheDocument();
  });

  it('tags a shop price a rule wrote, and a proposal that waits, with a badge for the reason', async () => {
    await openServices();
    const row = await serviceRow('T-Mobile USA Unlock');
    expect(row.getByText('$19.99')).toBeInTheDocument();
    expect(row.getByText('Rule').closest('[title]')).toHaveAttribute(
      'title',
      expect.stringContaining('Carrier unlock'),
    );
    expect(row.getByText('Waiting')).toBeInTheDocument();
    expect(row.getByRole('button', { name: 'Price waiting' })).toBeInTheDocument();
  });

  it('marks the service under its floor with the server’s floor price, a thin margin and its badge', async () => {
    await openServices();
    const row = await serviceRow('Chimera Tool 1 Month');
    expect(row.getByRole('button', { name: 'Edit price of Chimera Tool 1 Month, now $19.50' })).toHaveClass(
      'text-crit-fg',
    );
    expect(row.getByText('Floor $20.99')).toBeInTheDocument();
    expect(row.getByText('-1.5%')).toHaveClass('text-warn-fg');
    // The supplier raised its cost after the price was set.
    expect(row.getByText(/Supplier changed this from \$17\.00\./)).toBeInTheDocument();
    expect(row.getByRole('button', { name: 'Below floor' })).toBeInTheDocument();
    // No shop page yet: no shop price, and the switch says so.
    expect(row.getByText('None')).toBeInTheDocument();
    expect(row.getByText('Not on the shop')).toBeInTheDocument();
  });

  it('writes why a service cannot go on the shop beside its locked switch', async () => {
    await openServices('/catalog?q=Combination');
    const row = await serviceRow('Samsung Combination File');
    const toggle = row.getByRole('switch', { name: 'Samsung Combination File on the shop' });
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute('title', 'Cannot be sold on the shop');
    expect(row.getByText('Cannot be sold on the shop')).toBeInTheDocument();
  });

  it('names a service in the address from its name, and a part of it from a badge', async () => {
    const user = userEvent.setup();
    const app = await openServices();
    await user.click(
      (await serviceRow('AT&T USA Premier Unlock')).getByRole('button', { name: 'AT&T USA Premier Unlock' }),
    );
    expect(queryOf(app.location())).toBe('open=5');
    await user.click((await serviceRow('Chimera Tool 1 Month')).getByRole('button', { name: 'Below floor' }));
    expect(queryOf(app.location())).toBe('open=17&section=prices');
    // Nothing else changed: the table is still there with every service.
    expect(await screen.findByText('27 services')).toBeInTheDocument();
  });

  it('shows 25 services a page, A to Z, and pages on the server', async () => {
    const user = userEvent.setup();
    const app = await openServices();
    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument();
    expect((await servicesTable()).getAllByRole('row')).toHaveLength(26); // the header and 25 services
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(queryOf(app.location())).toBe('page=2');
    expect(await serviceRow('Z3X Credits x10')).toBeTruthy();
    expect((await servicesTable()).getAllByRole('row')).toHaveLength(3);
  });

  it('moves an address past the last page back to the last page that has rows', async () => {
    const app = await openServices('/catalog?page=9');
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument();
    expect(queryOf(app.location())).toBe('page=2');
  });

  it('sorts on the server by cost and by shop price, and keeps the sort in the address', async () => {
    const user = userEvent.setup();
    const app = await openServices();
    await user.click(await screen.findByRole('button', { name: 'Supplier and cost' }));
    expect(queryOf(app.location())).toBe('sort=cost&dir=asc');
    await waitFor(async () =>
      expect((await servicesTable()).getAllByRole('row')[1]).toHaveTextContent('Blacklist Status (GSMA)'),
    );
    await user.click(screen.getByRole('button', { name: 'Shop price' }));
    expect(queryOf(app.location())).toBe('sort=retailPrice&dir=asc');
    await waitFor(async () =>
      expect((await servicesTable()).getAllByRole('row')[1]).toHaveTextContent('$3.99'),
    );
  });
});

describe('filters', () => {
  it('searches by name, code or category after a pause and clears with Clear filters', async () => {
    const user = userEvent.setup();
    const app = await openServices();
    await screen.findByText('27 services');
    await user.type(screen.getByRole('searchbox', { name: 'Search service, code, category' }), 'carrier');
    await waitFor(() => expect(queryOf(app.location())).toBe('q=carrier'));
    expect(await screen.findByText('6 services')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(queryOf(app.location())).toBe('');
    expect(await screen.findByText('27 services')).toBeInTheDocument();
  });

  it('filters by type, category and supplier', async () => {
    const user = userEvent.setup();
    const app = await openServices();
    await screen.findByText('27 services');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by type' }), 'Remote');
    expect(queryOf(app.location())).toBe('type=remote');
    expect(await screen.findByText('4 services')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    const category = screen.getByRole('combobox', { name: 'Filter by category' });
    await within(category).findByRole('option', { name: 'Credits' });
    await user.selectOptions(category, 'Credits');
    expect(queryOf(app.location())).toBe('categoryId=6');
    expect(await screen.findByText('3 services')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    const supplier = screen.getByRole('combobox', { name: 'Filter by supplier' });
    await within(supplier).findByRole('option', { name: 'Gulf Server Hub' });
    await user.selectOptions(supplier, 'Gulf Server Hub');
    expect(queryOf(app.location())).toBe('supplierId=2');
    expect(await screen.findByText('5 services')).toBeInTheDocument();
  });

  it('locks the supplier filter without suppliers:read and still shows a supplier the address names', async () => {
    await openServices('/catalog?supplierId=2', { permissions: ['catalog:read', 'storefront:read'] });
    const supplier = screen.getByRole('combobox', { name: 'Filter by supplier' });
    expect(supplier).toBeDisabled();
    expect(supplier).toHaveAttribute('title', 'You need the suppliers:read permission');
    expect(supplier).toHaveDisplayValue('Supplier #2');
    expect(await screen.findByText('5 services')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });

  it('shows a below-floor filter from an old link as a chip that removes it', async () => {
    const user = userEvent.setup();
    const app = await openServices('/catalog?belowFloor=true');
    expect(await screen.findByText('1 service')).toBeInTheDocument();
    expect(await serviceRow('Chimera Tool 1 Month')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Remove the filter Below floor' }));
    expect(queryOf(app.location())).toBe('');
    expect(await screen.findByText('27 services')).toBeInTheDocument();
  });

  it('shows the on-the-shop filter of a finished run as a chip that removes it', async () => {
    const user = userEvent.setup();
    const app = await openServices('/catalog?shop=on');
    expect(await screen.findByText('11 services')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove the filter On the shop' }));
    expect(queryOf(app.location())).toBe('');
    expect(await screen.findByText('27 services')).toBeInTheDocument();
  });

  it('says so when nothing matches and offers to clear', async () => {
    const user = userEvent.setup();
    await openServices('/catalog?q=zzzz-nothing');
    expect(await screen.findByText('No services match')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
    expect(await screen.findByText('27 services')).toBeInTheDocument();
  });

  it('says a list is empty and offers every service', async () => {
    const user = userEvent.setup();
    // Nothing needs a person today: the server answers the attention list empty.
    mockServer.use(
      http.get('*/admin/services', ({ request }) =>
        new URL(request.url).searchParams.get('needsAttention') === 'true'
          ? HttpResponse.json([], {
              headers: { 'x-total-count': '0', 'access-control-expose-headers': 'x-total-count' },
            })
          : undefined,
      ),
    );
    await openServices('/catalog?chip=attention');
    expect(await screen.findByText('Nothing in this list')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show all services' }));
    expect(await screen.findByText('27 services')).toBeInTheDocument();
  });
});

describe('a role that may not read the shop', () => {
  it('gets no shop columns, no "Not on the shop" chip, and an old shop filter is not sent', async () => {
    const only = ['catalog:read', 'pricing:read'];
    serverGrants(only);
    await openServices('/catalog?shop=on&chip=notonshop', { permissions: only });
    // Both are dropped: the server would refuse them with 403. The list is every service.
    expect(await screen.findByText('27 services')).toBeInTheDocument();
    await waitFor(() => expect(chipTexts()).toEqual(['All27', 'Needs attention4', 'Switched off1']));
    expect(screen.queryByRole('button', { name: 'Remove the filter On the shop' })).not.toBeInTheDocument();
    const headers = (await servicesTable()).getAllByRole('columnheader').map((cell) => cell.textContent);
    expect(headers).toContain('Shop price');
    expect(headers).not.toContain('On shop');
    expect(
      (await serviceRow('EE UK Unlock')).queryByRole('switch', { name: /on the shop$/ }),
    ).not.toBeInTheDocument();
  });
});

describe('ticked services', () => {
  it('are forgotten when the page changes, so nothing is changed out of sight', async () => {
    const user = userEvent.setup();
    await openServices();
    await user.click(await screen.findByRole('checkbox', { name: 'Select row 9' }));
    expect(screen.getByRole('region', { name: 'Selected services' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await serviceRow('Z3X Credits x10')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Selected services' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(await screen.findByRole('checkbox', { name: 'Select row 9' })).not.toBeChecked();
  });

  it('are forgotten when the sort changes', async () => {
    const user = userEvent.setup();
    await openServices();
    await user.click(await screen.findByRole('checkbox', { name: 'Select row 9' }));
    await user.click(screen.getByRole('button', { name: 'Supplier and cost' }));
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Selected services' })).not.toBeInTheDocument(),
    );
  });

  it('are forgotten when the list or a filter changes', async () => {
    const user = userEvent.setup();
    await openServices();
    await user.click(await screen.findByRole('checkbox', { name: 'Select row 9' }));
    await user.click(chipStrip().getByRole('tab', { name: /^Switched off/ }));
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Selected services' })).not.toBeInTheDocument(),
    );
  });
});
