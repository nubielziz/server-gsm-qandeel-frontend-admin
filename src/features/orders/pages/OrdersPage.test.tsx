// Tests for the orders page, run through the whole app against the dev mock API: the tabs and their counts, the filters in the
// address, paging, the empty states, the keyboard, the CSV export and what the staff member's permissions hide.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { openOrders, orderRow, ordersTable, statusTabs, tabTexts } from '@/test/ordersPage';
import { setupMockApi } from '@/test/renderApp';

setupMockApi();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite
// runs in parallel. Every flow here also goes through the mock API, so give them room.
vi.setConfig({ testTimeout: 20_000 });

describe('tabs and counts', () => {
  it('shows the demo’s seven tabs with the counts the server gives, and the open and past-SLA figures', async () => {
    await openOrders();
    await waitFor(() =>
      expect(tabTexts()).toEqual([
        'Open48',
        'Needs review15',
        'Queued6',
        'Processing37',
        'Completed766',
        'Rejected50',
        'All864',
      ]),
    );
    // The demo opens on Open: what is waiting, oldest first.
    expect(screen.getByRole('tab', { name: /Open/ })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText(/48 open, \d+ past SLA\./)).toBeInTheDocument();
    expect(await screen.findByText('48 orders')).toBeInTheDocument();
  });

  it('keeps the chosen tab in the address and drops the Status column on a tab that names one status', async () => {
    const user = userEvent.setup();
    const app = await openOrders();
    expect(await screen.findByRole('columnheader', { name: /Status/ })).toBeInTheDocument();

    await user.click(statusTabs().getByRole('tab', { name: /Needs review/ }));
    expect(app.location()).toBe('/orders?tab=review');
    expect(await screen.findByRole('columnheader', { name: 'Why it stopped' })).toBeInTheDocument();
    // Needs review mixes four queues, so the badge and its queue line stay.
    expect(screen.getByRole('columnheader', { name: /^Status/ })).toBeInTheDocument();
    const manual = await orderRow('ORD-48842');
    expect(manual.getByText('Manual service: operator dispatch required')).toBeInTheDocument();
    expect(manual.getByText('Manual order')).toBeInTheDocument();
    expect(await screen.findByText('15 orders')).toBeInTheDocument();

    await user.click(statusTabs().getByRole('tab', { name: /Queued/ }));
    expect(app.location()).toBe('/orders?tab=queued');
    await waitFor(() =>
      expect(screen.queryByRole('columnheader', { name: /^Status/ })).not.toBeInTheDocument(),
    );
  });

  it('opens the tab named in the address', async () => {
    await openOrders('/orders?tab=queued');
    expect(await screen.findByText('6 orders')).toBeInTheDocument();
    expect(statusTabs().getByRole('tab', { name: /Queued/ })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('the table', () => {
  it('shows the newest orders first on the All tab, with buyer, service, input, supplier, SLA, price and profit', async () => {
    await openOrders('/orders?tab=all');
    const row = await orderRow('ORD-48859');
    expect(row.getByText('Muscat Mobile Clinic')).toBeInTheDocument();
    expect(row.getByText('Dhru API')).toBeInTheDocument();
    expect(row.getByText('T-Mobile USA Unlock')).toBeInTheDocument();
    expect(row.getByText('IMEI')).toBeInTheDocument();
    expect(row.getByText('35 460711 658877 7')).toBeInTheDocument();
    expect(row.getByText('Nordic GSM')).toBeInTheDocument();
    expect(row.getByText('Processing')).toBeInTheDocument();
    expect(row.getByText('$12.49')).toBeInTheDocument();
    expect(row.getByText('$2.69')).toBeInTheDocument();
    const rows = (await ordersTable()).getAllByRole('row');
    expect(rows).toHaveLength(26); // the header and 25 orders
  });

  it('marks a storefront order with its tag, the masked email and what the customer paid', async () => {
    await openOrders('/orders?tab=all&channel=b2c');
    const row = await orderRow('SF-20503');
    expect(row.getByText('Storefront')).toBeInTheDocument();
    expect(row.getByText(/paid /)).toBeInTheDocument();
    expect(row.getByText(/•••@/)).toBeInTheDocument();
  });

  it('starts the Open tab with the order that has waited longest', async () => {
    await openOrders();
    expect((await ordersTable()).getAllByRole('row')[1]).toHaveTextContent('ORD-48784');
    expect(await screen.findByRole('button', { name: /^Order/ })).toBeInTheDocument();
  });

  it('pages 25 at a time and keeps the page in the address', async () => {
    const user = userEvent.setup();
    const app = await openOrders();
    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(app.location()).toBe('/orders?page=2');
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument();
    await waitFor(async () => expect((await ordersTable()).queryByText('ORD-48784')).not.toBeInTheDocument());
    expect(await orderRow('ORD-48859')).toBeTruthy();
  });

  it('moves an address past the last page back to the last page that has rows', async () => {
    const app = await openOrders('/orders?page=9');
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument();
    expect(app.location()).toBe('/orders?page=2');
    expect(await orderRow('ORD-48859')).toBeTruthy();
  });

  it('sorts on the server when a column header is pressed', async () => {
    const user = userEvent.setup();
    const app = await openOrders();
    await user.click(await screen.findByRole('button', { name: 'Price' }));
    expect(app.location()).toBe('/orders?sort=totalPrice&dir=asc');
    await waitFor(async () =>
      expect((await ordersTable()).getAllByRole('row')[1]).toHaveTextContent(/\$0\.\d\d/),
    );
  });
});

describe('filters', () => {
  it('searches after a pause, keeps the text in the address and clears it with Clear filters', async () => {
    const user = userEvent.setup();
    const app = await openOrders();
    await screen.findByText('48 orders');
    await user.type(
      screen.getByRole('searchbox', { name: 'Search ID, IMEI, buyer, reference' }),
      'ORD-48859',
    );
    await waitFor(() => expect(app.location()).toBe('/orders?q=ORD-48859'));
    expect(await screen.findByText('1 order')).toBeInTheDocument();
    expect(await orderRow('ORD-48859')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(app.location()).toBe('/orders');
    expect(await screen.findByText('48 orders')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
  });

  it('filters by type, channel and the Past SLA chip, each in the address', async () => {
    const user = userEvent.setup();
    const app = await openOrders();
    await screen.findByText('48 orders');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by channel' }), 'Storefront');
    expect(app.location()).toBe('/orders?channel=b2c');
    expect(await screen.findByText('12 orders')).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by type' }), 'File');
    expect(app.location()).toBe('/orders?channel=b2c&type=file');

    const chip = screen.getByRole('button', { name: 'Past SLA' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await user.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(app.location()).toContain('pastSla=true');
  });

  it('filters by supplier and merchant from the menus the server fills', async () => {
    const user = userEvent.setup();
    const app = await openOrders();
    const suppliers = await screen.findByRole('combobox', { name: 'Filter by supplier' });
    await waitFor(() =>
      expect(within(suppliers).getByRole('option', { name: 'Nordic GSM' })).toBeInTheDocument(),
    );
    await user.selectOptions(suppliers, 'Nordic GSM');
    expect(app.location()).toBe('/orders?supplierId=1');
    const merchants = screen.getByRole('combobox', { name: 'Filter by merchant' });
    await waitFor(() =>
      expect(within(merchants).getByRole('option', { name: 'Muscat Mobile Clinic' })).toBeInTheDocument(),
    );
    await user.selectOptions(merchants, 'Muscat Mobile Clinic');
    expect(app.location()).toBe('/orders?supplierId=1&clientId=13');
  });

  it('says so when nothing matches, and offers to clear the filters', async () => {
    const user = userEvent.setup();
    const app = await openOrders('/orders?q=zzzz-no-such-order');
    expect(await screen.findByText('No orders match these filters')).toBeInTheDocument();
    // The toolbar and the empty state both offer it, as the demo did.
    expect(screen.getAllByRole('button', { name: 'Clear filters' })).toHaveLength(2);
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
    expect(app.location()).toBe('/orders');
    expect(await screen.findByText('48 orders')).toBeInTheDocument();
  });

  it('leaves out the supplier and merchant menus when the staff member cannot read them', async () => {
    await openOrders('/orders', { permissions: ['orders:read'] });
    await screen.findByText('48 orders');
    expect(screen.getByRole('combobox', { name: 'Filter by type' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Filter by supplier' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Filter by merchant' })).not.toBeInTheDocument();
  });
});

describe('keyboard', () => {
  it('moves the highlight with j and k, ticks with x and opens the order with Enter', async () => {
    const user = userEvent.setup();
    const app = await openOrders('/orders?tab=all');
    await orderRow('ORD-48859');
    await user.keyboard('j');
    const rows = (await ordersTable()).getAllByRole('row');
    expect(rows[1]).toHaveAttribute('data-cursor', '1');
    await user.keyboard('j');
    expect((await ordersTable()).getAllByRole('row')[2]).toHaveAttribute('data-cursor', '1');
    await user.keyboard('k');
    expect((await ordersTable()).getAllByRole('row')[1]).toHaveAttribute('data-cursor', '1');

    await user.keyboard('x');
    expect(await screen.findByRole('region', { name: 'Bulk actions' })).toHaveTextContent('1 selected');
    await user.keyboard('x');
    expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument();

    await user.keyboard('{Enter}');
    expect(app.location()).toBe('/orders?tab=all&order=48859');
  });
});

describe('export', () => {
  it('downloads the CSV of the current filters and says how many orders it holds', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: () => 'blob:test', revokeObjectURL: vi.fn() }),
    );
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await openOrders('/orders?tab=queued');
    await screen.findByText('6 orders');
    await user.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(await screen.findByText('Exported 6 orders')).toBeInTheDocument();
    expect(screen.getByText('orders-export.csv')).toBeInTheDocument();
    expect(click).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});

describe('permissions', () => {
  it('lets a read-only staff member browse but disables Bulk reply, with the reason', async () => {
    await openOrders('/orders?tab=all', { permissions: ['orders:read'] });
    const bulk = await screen.findByRole('button', { name: 'Bulk reply' });
    expect(bulk).toBeDisabled();
    expect(bulk).toHaveAttribute('title', 'You need the orders:update permission');
    expect(await orderRow('ORD-48859')).toBeTruthy();
  });
});

describe('a whole shift', () => {
  it('takes a manual order from the Needs review tab to Completed, and the counts follow', async () => {
    const user = userEvent.setup();
    const app = await openOrders();
    await waitFor(() => expect(tabTexts()).toContain('Needs review15'));

    // The manual order waits under Needs review; its row opens the drawer.
    await user.click(statusTabs().getByRole('tab', { name: /Needs review/ }));
    await user.click(await screen.findByRole('button', { name: 'ORD-48842' }));
    expect(app.location()).toBe('/orders?tab=review&order=48842');
    const drawer = within(await screen.findByRole('dialog', { name: 'ORD-48842' }));

    // Accept it, leave a note for the team, then complete it with the default reply.
    await user.click(await drawer.findByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(drawer.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument());
    await user.type(
      drawer.getByRole('textbox', { name: 'Add a note' }),
      'Dispatched by hand to the carrier portal',
    );
    await user.click(drawer.getByRole('button', { name: 'Add note' }));
    expect(await drawer.findAllByText('Dispatched by hand to the carrier portal')).not.toHaveLength(0);
    await user.click(drawer.getByRole('button', { name: 'Complete' }));
    expect(await screen.findByText('ORD-48842 completed')).toBeInTheDocument();
    await waitFor(() => expect(drawer.getByText('Result sent to merchant')).toBeInTheDocument());

    // Closing the drawer leaves the tab in the address, and the tabs show the order moved.
    await user.click(drawer.getByRole('button', { name: 'Close details' }));
    expect(app.location()).toBe('/orders?tab=review');
    await waitFor(() =>
      expect(tabTexts()).toEqual([
        'Open47',
        'Needs review14',
        'Queued6',
        'Processing37',
        'Completed767',
        'Rejected50',
        'All864',
      ]),
    );
    await waitFor(async () => expect((await ordersTable()).queryByText('ORD-48842')).not.toBeInTheDocument());
  });

  it('finds an order in the command palette and opens its drawer', async () => {
    const user = userEvent.setup();
    const app = await openOrders('/orders?tab=rejected');
    await user.keyboard('{Control>}k{/Control}');
    const palette = within(await screen.findByRole('dialog', { name: 'Command palette' }));
    await user.type(palette.getByRole('combobox'), '48859');
    await user.click(await palette.findByRole('option', { name: /ORD-48859\s+T-Mobile USA Unlock/ }));
    // A palette result is a link: it opens the order on a clean Orders page.
    expect(app.location()).toBe('/orders?order=48859');
    expect(await screen.findByRole('dialog', { name: 'ORD-48859' })).toBeInTheDocument();
  });
});
