// Tests for the Pricing view of the Product / Services page, run through the whole app against the dev mock API: the grid with every figure the
// server sent, the cells that can be typed in and how a typed cell is marked, the save row by row through the existing routes (the base price,
// the whole set of group prices with the shop price as it was), the server's words under a refused cell, the Enabled and Order boxes, the
// address (search, group, page size), the states (empty, error), the question asked before typed prices are lost, the bulk change that opens on
// the kind and the group of the grid, and what a role without a permission sees.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { replaceSupplierLinks } from '@/features/suppliers';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { getService, listPriceGrid } from '../../../api';
import { servicesStore } from '../../../mocks/store';
import { groupHandlers } from '../../../mocks/testGroups';
import { kindStrip, openProducts } from '../../../test/productsPage';
import { recordRequests } from '../../../test/requests';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
afterEach(() => vi.restoreAllMocks());

// The merchants feature serves the group list; these tests bring their own copy of it, with the shop's group (kind b2c_retail) added.
const RETAIL = 9;
beforeEach(async () => {
  mockServer.use(...groupHandlers);
  (await servicesStore()).groups.push({
    id: RETAIL,
    name: 'Storefront retail',
    kind: 'b2c_retail',
    discountPercent: 0,
  });
});

const IMEI = '/products?view=pricing';
const SERVER = '/products?view=pricing&type=server';
const ATT = 'AT&T USA Premier Unlock'; // service 5: a typed shop price of 25.99, a fixed VIP price of 15.90
const ATT_ID = 5;
const APPLE = 'Apple Warranty & Activation Date'; // service 2: a shop price that follows a rule
const EE = 'EE UK Unlock'; // service 9, minimum profit 0.38 on a cost of 6.40
const XIAOMI = 'Xiaomi Mi Account Clean'; // service 14, switched off
const SAVE = { name: 'Save prices' };

type User = ReturnType<typeof userEvent.setup>;

/**
 * Opens the view and waits for its grid. A role that can read the merchant groups also waits for them (the columns are named by them, and
 * the rank and shop boxes open once the shop group is known).
 */
async function openPricing(route = IMEI, options: { permissions?: string[] } = {}) {
  const app = await openProducts(route, options);
  await screen.findByRole('table', { name: 'Price grid' }, { timeout: 10_000 });
  if (!options.permissions) await screen.findByRole('columnheader', { name: 'Wholesale [USD]' });
  return app;
}

/** The row of the grid that holds a service. */
const rowOf = (name: string) => {
  const cell = within(screen.getByRole('table', { name: 'Price grid' })).getByText(name);
  return within(cell.closest('tr') as HTMLElement);
};

/** One box of the grid, by its name ("Base price", "Shop price", "VIP price", "Position") and the service. */
const box = (kind: string, service: string) => screen.getByRole('textbox', { name: `${kind} of ${service}` });

/** Clears a box and types a text in it. */
async function type(user: User, input: HTMLElement, text: string) {
  await user.clear(input);
  if (text) await user.type(input, text);
}

/** The grid answers no service at all, as for a kind that has none yet. */
const answerEmptyGrid = () =>
  mockServer.use(
    http.get('*/admin/services/price-grid', () =>
      HttpResponse.json([], {
        headers: { 'x-total-count': '0', 'access-control-expose-headers': 'x-total-count' },
      }),
    ),
  );

/** The requests of one method to one path. */
const sentTo = (requests: ReturnType<typeof recordRequests>, method: string, path: string) =>
  requests.sent().filter((sent) => sent.method === method && sent.url.pathname === path);

describe('the grid', () => {
  it('lists the services of the kind with the columns of the layout: cost, API price, base, shop and one price per merchant group', async () => {
    await openPricing();
    const table = within(screen.getByRole('table', { name: 'Price grid' }));
    for (const name of [
      'Service Name',
      'Purchase Cost',
      'API price',
      'Base Price [USD]',
      'Retail Price [USD]',
      'Standard [USD]',
      'Wholesale [USD]',
      'VIP [USD]',
    ]) {
      expect(table.getByRole('columnheader', { name })).toBeInTheDocument();
    }
    expect(table.getAllByRole('row')).toHaveLength(15); // the header and the 14 IMEI services
    expect(screen.getByText('Results: 1 - 14 of 14')).toBeInTheDocument();
  });

  it('prints the figures the server worked out: the cost, the supplier price in step, the margins, the shop price with its source', async () => {
    await openPricing();
    const row = rowOf(ATT);
    expect(row.getByText('#5')).toBeInTheDocument();
    // The cost is printed once, as the supplier's price; the Purchase Cost box is read-only and empty, and says where the cost comes from.
    expect(row.getAllByText('$13.50')).toHaveLength(1);
    const purchase = row.getByRole('textbox', { name: `Purchase cost of ${ATT}` });
    expect(purchase).toHaveValue('');
    expect(purchase).toHaveAttribute('readonly');
    expect(purchase).toHaveAttribute('title', expect.stringContaining('supplier connection'));
    expect(row.getByText(/In step with the supplier/)).toBeInTheDocument();
    expect(box('Base price', ATT)).toHaveValue('17.28');
    expect(row.getByText('+ $3.78')).toBeInTheDocument();
    expect(box('Shop price', ATT)).toHaveValue('25.99');
    // The server says `manual`; the grid says "typed", as the shop part does.
    expect(row.getByText('typed')).toBeInTheDocument();
    expect(row.queryByText('manual')).not.toBeInTheDocument();
    expect(row.getByText('+ $12.49')).toBeInTheDocument();
    // The fixed price of VIP is in its box; Standard follows the base price and says what it pays.
    expect(box('VIP price', ATT)).toHaveValue('15.90');
    expect(box('Standard price', ATT)).toHaveValue('');
    expect(box('Standard price', ATT)).toHaveAttribute('placeholder', 'Base');
    expect(row.getByText('$16.93')).toBeInTheDocument();
    expect(row.getByText('+ $3.43')).toBeInTheDocument();
    expect(rowOf(APPLE).getByText('rule')).toBeInTheDocument();
  });

  it('says when the supplier price moved and when the base price is under its floor, from the server’s own figures', async () => {
    await openPricing(SERVER);
    const row = rowOf('Chimera Tool 1 Month');
    expect(row.getByText('Moved, was $17.00')).toBeInTheDocument();
    expect(row.getByText('- $0.300')).toBeInTheDocument();
    expect(row.getByText('Under the floor')).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: 'Price grid' })).getAllByRole('row')).toHaveLength(6);
  });

  it('opens the pricing part of a service from the dollar tool', async () => {
    await openPricing();
    expect(rowOf(ATT).getByRole('link', { name: `Set pricing of ${ATT}` })).toHaveAttribute(
      'href',
      '/products?view=edit&type=imei&id=5&part=pricing',
    );
  });

  it('keeps the supplier’s name out of the API price cell and on the tick, as a title', async () => {
    await openPricing();
    const { supplier } = await getService(ATT_ID);
    const row = rowOf(ATT);
    const tick = row.getByText(/In step with the supplier/).closest('[title]');
    expect(tick).toHaveAttribute('title', supplier?.name);
    expect(row.queryByText(supplier?.name ?? '')).not.toBeInTheDocument();
  });

  it('fills the Purchase Cost box only for a service that has no supplier, and then has no API price', async () => {
    await signInAs();
    await replaceSupplierLinks(ATT_ID, { links: [] });
    await openPricing();
    const row = rowOf(ATT);
    const purchase = row.getByRole('textbox', { name: `Purchase cost of ${ATT}` });
    expect(purchase).toHaveValue('13.50');
    expect(purchase).toHaveAttribute('readonly');
    expect(row.getByTitle('No supplier is linked')).toHaveTextContent('—');
    // A service that keeps its supplier still shows the cost once, as the API price, with an empty box.
    expect(rowOf(APPLE).getByRole('textbox', { name: `Purchase cost of ${APPLE}` })).toHaveValue('');
  });

  it('asks for the stored order of the services from the start, so Set Order shows its effect', async () => {
    const requests = recordRequests();
    await openPricing();
    const reads = requests.sent().filter((sent) => sent.url.pathname === '/admin/services/price-grid');
    expect(reads.length).toBeGreaterThan(0);
    expect(reads.every((sent) => sent.url.searchParams.get('_sort') === 'sort')).toBe(true);
  });
});

describe('typing in the grid', () => {
  it('marks a typed cell and takes the mark back when the saved price is typed again', async () => {
    const user = userEvent.setup();
    await openPricing();
    const base = box('Base price', ATT);
    await type(user, base, '18');
    expect(base).toHaveAttribute('data-changed', 'true');
    expect(rowOf(ATT).getByText('Unsaved')).toBeInTheDocument();
    expect(screen.getByText('1 price typed, not saved')).toBeInTheDocument();
    expect(screen.getByRole('button', SAVE)).toBeEnabled();

    await type(user, base, '17.280');
    expect(base).not.toHaveAttribute('data-changed');
    expect(rowOf(ATT).queryByText('Unsaved')).not.toBeInTheDocument();
    expect(screen.getByRole('button', SAVE)).toBeDisabled();
  });

  it('throws away what was typed with Discard', async () => {
    const user = userEvent.setup();
    await openPricing();
    await type(user, box('Base price', ATT), '18');
    await type(user, box('Wholesale price', ATT), '16');
    expect(screen.getByText('2 prices typed, not saved')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(box('Base price', ATT)).toHaveValue('17.28');
    expect(box('Wholesale price', ATT)).toHaveValue('');
    expect(screen.queryByText(/typed, not saved/)).not.toBeInTheDocument();
  });
});

describe('Save prices', () => {
  it('saves the base price, then the whole set of group prices with the shop price as it was, and shows the new figures', async () => {
    const user = userEvent.setup();
    await openPricing();
    const requests = recordRequests();
    await type(user, box('Base price', ATT), '18.5');
    await type(user, box('Wholesale price', ATT), '17.1');
    await user.click(screen.getByRole('button', SAVE));
    expect(await screen.findByText('1 service saved')).toBeInTheDocument();

    const patch = sentTo(requests, 'PATCH', '/admin/services/5');
    const put = sentTo(requests, 'PUT', '/admin/services/5/group-prices');
    expect(patch.map((sent) => sent.body)).toEqual([{ basePrice: '18.5000' }]);
    expect(put.map((sent) => sent.body)).toEqual([
      {
        prices: [
          { groupId: 2, price: '17.1000' },
          { groupId: 3, price: '15.9000' },
          { groupId: RETAIL, price: '25.9900' },
        ],
        retailPriceSeen: '25.9900',
      },
    ]);
    // The base price goes first: the shop floor starts from it.
    const methods = requests
      .sent()
      .filter((sent) => sent.url.pathname.startsWith('/admin/services/5'))
      .map((sent) => sent.method);
    expect(methods.indexOf('PATCH')).toBeLessThan(methods.indexOf('PUT'));

    await waitFor(() => expect(box('Base price', ATT)).toHaveValue('18.50'));
    expect(rowOf(ATT).getByText('+ $5.00')).toBeInTheDocument();
    expect(box('Wholesale price', ATT)).toHaveValue('17.10');
    expect(rowOf(ATT).queryByText('Unsaved')).not.toBeInTheDocument();
    expect((await getService(5)).basePrice).toBe('18.5000');
    expect(screen.queryByText(/typed, not saved/)).not.toBeInTheDocument();
  });

  it('sends a typed shop price as the shop group’s row, and the price the row showed so the server can tell the box was touched', async () => {
    const user = userEvent.setup();
    await openPricing();
    const requests = recordRequests();
    await type(user, box('Shop price', ATT), '27');
    await user.click(screen.getByRole('button', SAVE));
    expect(await screen.findByText('1 service saved')).toBeInTheDocument();
    expect(sentTo(requests, 'PUT', '/admin/services/5/group-prices')[0]?.body).toEqual({
      prices: [
        { groupId: 3, price: '15.9000' },
        { groupId: RETAIL, price: '27.0000' },
      ],
      retailPriceSeen: '25.9900',
    });
    expect(sentTo(requests, 'PATCH', '/admin/services/5')).toHaveLength(0);
    await waitFor(() => expect(box('Shop price', ATT)).toHaveValue('27.00'));
    expect(rowOf(ATT).getByText('+ $13.50')).toBeInTheDocument();
  });

  it('keeps a shop price that follows its rule following: the box nobody touched goes back as the figure the row showed', async () => {
    const user = userEvent.setup();
    await openPricing();
    const requests = recordRequests();
    await type(user, box('VIP price', APPLE), '0.09');
    await user.click(screen.getByRole('button', SAVE));
    expect(await screen.findByText('1 service saved')).toBeInTheDocument();
    expect(sentTo(requests, 'PUT', '/admin/services/2/group-prices')[0]?.body).toMatchObject({
      retailPriceSeen: '3.9900',
      prices: expect.arrayContaining([{ groupId: RETAIL, price: '3.9900' }]),
    });
    await waitFor(() => expect(box('VIP price', APPLE)).toHaveValue('0.09'));
    expect(rowOf(APPLE).getByText('rule')).toBeInTheDocument();
  });

  it('removes the fixed price of a group when its box is emptied: the group is left out of the set', async () => {
    const user = userEvent.setup();
    await openPricing();
    const requests = recordRequests();
    await type(user, box('VIP price', ATT), '');
    await user.click(screen.getByRole('button', SAVE));
    expect(await screen.findByText('1 service saved')).toBeInTheDocument();
    expect(sentTo(requests, 'PUT', '/admin/services/5/group-prices')[0]?.body).toEqual({
      prices: [{ groupId: RETAIL, price: '25.9900' }],
      retailPriceSeen: '25.9900',
    });
    await waitFor(() => expect(box('VIP price', ATT)).toHaveValue(''));
    expect((await listPriceGrid({ q: 'AT&T' })).data[0]?.groupPrices[2]?.fixedPrice).toBeNull();
  });

  it('saves the rows that the server takes and keeps the refused one with the server’s words under its box', async () => {
    const user = userEvent.setup();
    await openPricing();
    await type(user, box('Base price', EE), '1');
    await type(user, box('Base price', ATT), '18');
    await user.click(screen.getByRole('button', SAVE));
    expect(await screen.findByText('1 service saved')).toBeInTheDocument();
    expect(
      await screen.findByText('Below the floor. Cost $6.40 plus minimum profit $0.38 is $6.78.'),
    ).toBeInTheDocument();
    // The refused box keeps what was typed and is marked invalid; the saved one is plain again.
    expect(box('Base price', EE)).toHaveValue('1');
    expect(box('Base price', EE)).toHaveAttribute('aria-invalid', 'true');
    expect(rowOf(EE).getByText('Unsaved')).toBeInTheDocument();
    expect(screen.getByText('1 saved, 1 not saved')).toBeInTheDocument();
    await waitFor(() => expect(box('Base price', ATT)).toHaveValue('18.00'));
    expect((await getService(9)).basePrice).toBe('8.3800');
  });

  it('puts a refusal of one price of the set under that price’s box', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.put('*/admin/services/:id/group-prices', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          {
            field: 'prices.0.price',
            message: 'Below the floor of $14.31 (cost $13.50 plus $0.81 minimum profit).',
          },
        ]),
      ),
    );
    await openPricing();
    await type(user, box('Wholesale price', ATT), '10');
    await user.click(screen.getByRole('button', SAVE));
    expect(
      await screen.findByText('Below the floor of $14.31 (cost $13.50 plus $0.81 minimum profit).'),
    ).toBeInTheDocument();
    expect(box('Wholesale price', ATT)).toHaveValue('10');
    expect(screen.getByText('0 saved, 1 not saved')).toBeInTheDocument();
  });

  it('finds a price it cannot send before it calls the server', async () => {
    const user = userEvent.setup();
    await openPricing();
    const requests = recordRequests();
    await type(user, box('Base price', EE), 'abc');
    await type(user, box('Shop price', ATT), '');
    await user.click(screen.getByRole('button', SAVE));
    expect(await screen.findByText('Enter a price greater than zero.')).toBeInTheDocument();
    expect(screen.getByText('Type a shop price, or put the old one back.')).toBeInTheDocument();
    expect(requests.sent().filter((sent) => sent.method !== 'GET')).toHaveLength(0);
  });
});

describe('Display Enable/Disable Service', () => {
  it('puts an Enabled box before the name of every service that switches the service at once', async () => {
    const user = userEvent.setup();
    await openPricing();
    const requests = recordRequests();
    expect(screen.queryByRole('checkbox', { name: `${XIAOMI} enabled` })).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Display Enable/Disable Service' }));
    const xiaomi = screen.getByRole('checkbox', { name: `${XIAOMI} enabled` });
    expect(xiaomi).not.toBeChecked();
    // The box sits before the name, in the Service Name cell; it has no column of its own.
    expect(xiaomi.closest('td')).toBe(screen.getByText(XIAOMI).closest('td'));
    expect(screen.queryByRole('columnheader', { name: 'Enabled' })).not.toBeInTheDocument();
    expect(rowOf(XIAOMI).getByText(/Disabled/)).toBeInTheDocument();

    await user.click(xiaomi);
    expect(await screen.findByText(`${XIAOMI} enabled`)).toBeInTheDocument();
    expect(sentTo(requests, 'PATCH', '/admin/services/14')[0]?.body).toEqual({ status: 'active' });
    await waitFor(() => expect(screen.getByRole('checkbox', { name: `${XIAOMI} enabled` })).toBeChecked());

    await user.click(screen.getByRole('checkbox', { name: `${EE} enabled` }));
    expect(await screen.findByText(`${EE} disabled`)).toBeInTheDocument();
    expect(sentTo(requests, 'PATCH', '/admin/services/9')[0]?.body).toEqual({ status: 'disabled' });
  });
});

describe('Set Order', () => {
  // The grid reads the order merchants see from the start (see "asks for the stored order…"), so ticking the box reads nothing again.
  it('adds a position box to every row and saves the typed positions in one call', async () => {
    const user = userEvent.setup();
    await openPricing();
    const requests = recordRequests();
    await user.click(screen.getByRole('checkbox', { name: 'Set Order' }));
    expect(await screen.findByRole('columnheader', { name: 'Order' })).toBeInTheDocument();
    expect(await screen.findByRole('textbox', { name: `Position of ${EE}` })).toHaveValue('0');

    await type(user, box('Position', EE), '7');
    await type(user, box('Position', ATT), '2');
    await user.click(screen.getByRole('button', { name: 'Save order' }));
    expect(await screen.findByText('Order saved')).toBeInTheDocument();
    expect(sentTo(requests, 'POST', '/admin/services/order')[0]?.body).toEqual({
      items: [
        { id: 5, sort: 2 },
        { id: 9, sort: 7 },
      ],
    });
    await waitFor(() => expect(box('Position', EE)).toHaveValue('7'));
    expect(box('Position', ATT)).toHaveValue('2');
    expect(screen.getByRole('button', { name: 'Save order' })).toBeDisabled();
  });

  it('says what is wrong with a position before it calls the server', async () => {
    const user = userEvent.setup();
    await openPricing();
    const requests = recordRequests();
    await user.click(screen.getByRole('checkbox', { name: 'Set Order' }));
    await screen.findByRole('textbox', { name: `Position of ${EE}` });
    await type(user, box('Position', EE), 'x');
    await user.click(screen.getByRole('button', { name: 'Save order' }));
    expect(await screen.findByText('Enter a whole number from 0 to 1,000,000.')).toBeInTheDocument();
    expect(box('Position', EE)).toHaveAttribute('aria-invalid', 'true');
    expect(sentTo(requests, 'POST', '/admin/services/order')).toHaveLength(0);
  });

  it('shows the server’s refusal of a position under its box', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/services/order', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'items.0.id', message: 'This service was archived.' },
        ]),
      ),
    );
    await openPricing();
    await user.click(screen.getByRole('checkbox', { name: 'Set Order' }));
    await screen.findByRole('textbox', { name: `Position of ${EE}` });
    await type(user, box('Position', EE), '4');
    await user.click(screen.getByRole('button', { name: 'Save order' }));
    expect(await screen.findByText('This service was archived.')).toBeInTheDocument();
    expect(box('Position', EE)).toHaveValue('4');
  });
});

describe('the address', () => {
  it('searches after a pause, filters by group and changes the page size, all in the address', async () => {
    const user = userEvent.setup();
    const app = await openPricing();
    await user.type(screen.getByRole('searchbox', { name: 'Search Service' }), 'unlock');
    await waitFor(() => expect(app.location()).toBe('/products?view=pricing&type=imei&q=unlock'), {
      timeout: 5_000,
    });
    await waitFor(() =>
      expect(within(screen.getByRole('table', { name: 'Price grid' })).getAllByRole('row')).toHaveLength(7),
    );

    await screen.findByRole('option', { name: 'Carrier unlock' });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Group' }), 'Carrier unlock');
    await waitFor(() => expect(app.location()).toBe('/products?view=pricing&type=imei&group=4&q=unlock'));

    await user.selectOptions(screen.getByRole('combobox', { name: /Page size/ }), '25');
    await waitFor(() =>
      expect(app.location()).toBe('/products?view=pricing&type=imei&group=4&q=unlock&size=25'),
    );
  });

  it('opens on a search and a group named in the address, and lists only the groups of the kind', async () => {
    await openPricing('/products?view=pricing&q=Samsung&group=2');
    expect(screen.getByRole('searchbox', { name: 'Search Service' })).toHaveValue('Samsung');
    expect(within(screen.getByRole('table', { name: 'Price grid' })).getAllByRole('row')).toHaveLength(3);
    // The groups come after the grid: the select then shows the group of the address, and offers the groups of the kind only.
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Group' })).toHaveDisplayValue('Samsung'),
    );
    const group = within(screen.getByRole('combobox', { name: 'Group' }));
    expect(group.getByRole('option', { name: 'Carrier unlock' })).toBeInTheDocument();
    expect(group.queryByRole('option', { name: 'Credits' })).not.toBeInTheDocument();
  });

  it('shows the currency the prices are in', async () => {
    await openPricing();
    expect(screen.getByRole('combobox', { name: 'Currency' })).toHaveDisplayValue('USD - Base');
  });
});

describe('Bulk change', () => {
  it('opens the bulk price dialog and shows the new prices once it was applied', async () => {
    const user = userEvent.setup();
    await openPricing(SERVER);
    await user.click(screen.getByRole('button', { name: 'Bulk change…' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Bulk price change' }));
    await dialog.findByRole('option', { name: 'Credits' });
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Category' }), 'Credits');
    await user.selectOptions(dialog.getByRole('combobox', { name: 'By' }), 'A fixed amount (USD)');
    await user.type(dialog.getByRole('textbox', { name: 'Amount (USD)' }), '1');
    await user.click(dialog.getByRole('button', { name: 'Preview' }));
    await user.click(await dialog.findByRole('button', { name: 'Apply to 3 services' }));
    expect(await screen.findByText('3 prices changed')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('10.35')).toBeInTheDocument();
  });

  it('opens on the kind and the group of the grid, offers only the groups of that kind, and sends the group', async () => {
    const user = userEvent.setup();
    await openPricing('/products?view=pricing&group=4');
    await user.click(screen.getByRole('button', { name: 'Bulk change…' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Bulk price change' }));
    await dialog.findByRole('option', { name: 'Carrier unlock' });
    expect(dialog.getByRole('combobox', { name: 'Category' })).toHaveDisplayValue('Carrier unlock');
    expect(dialog.getByRole('option', { name: 'Samsung' })).toBeInTheDocument();
    expect(dialog.queryByRole('option', { name: 'Credits' })).not.toBeInTheDocument();
    expect(dialog.getByText(/IMEI groups only\./)).toBeInTheDocument();

    const requests = recordRequests();
    await user.type(dialog.getByRole('textbox', { name: 'Percentage' }), '5');
    await user.click(dialog.getByRole('button', { name: 'Preview' }));
    await dialog.findByRole('table', { name: 'Price changes' });
    expect(sentTo(requests, 'POST', '/admin/services/bulk-price/preview')[0]?.body).toMatchObject({
      categoryId: 4,
    });
  });

  it('opens without a group chosen when the grid is on none, and still offers the groups of the kind only', async () => {
    const user = userEvent.setup();
    await openPricing(SERVER);
    await user.click(screen.getByRole('button', { name: 'Bulk change…' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Bulk price change' }));
    await dialog.findByRole('option', { name: 'Credits' });
    expect(dialog.getByRole('combobox', { name: 'Category' })).toHaveDisplayValue('Choose a category');
    expect(dialog.queryByRole('option', { name: 'Carrier unlock' })).not.toBeInTheDocument();
  });

  it('waits until the typed prices are saved or discarded', async () => {
    const user = userEvent.setup();
    await openPricing();
    const bulk = screen.getByRole('button', { name: 'Bulk change…' });
    expect(bulk).toBeEnabled();
    await type(user, box('Base price', ATT), '18');
    expect(bulk).toBeDisabled();
    expect(bulk).toHaveAttribute('title', 'Save or discard the typed prices first');
  });
});

describe('leaving the grid with typed prices', () => {
  const question = () => screen.queryByRole('dialog', { name: 'Discard your unsaved changes?' });
  const reload = () => {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  };

  it('asks before a link leaves the view, keeps the typed prices on "Keep editing" and leaves on "Discard changes"', async () => {
    const user = userEvent.setup();
    const app = await openPricing();
    await type(user, box('Base price', ATT), '18');
    await user.click(rowOf(ATT).getByRole('link', { name: `Set pricing of ${ATT}` }));
    const asking = within(await screen.findByRole('dialog', { name: 'Discard your unsaved changes?' }));
    expect(asking.getByText(/You have unsaved changes in Pricing\./)).toBeInTheDocument();
    expect(app.location()).not.toContain('view=edit');

    await user.click(asking.getByRole('button', { name: 'Keep editing' }));
    expect(question()).not.toBeInTheDocument();
    expect(box('Base price', ATT)).toHaveValue('18');

    await user.click(rowOf(ATT).getByRole('link', { name: `Set pricing of ${ATT}` }));
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Discard your unsaved changes?' })).getByRole(
        'button',
        {
          name: 'Discard changes',
        },
      ),
    );
    await waitFor(() => expect(app.location()).toBe('/products?view=edit&type=imei&id=5&part=pricing'));
  });

  it('asks before another kind of service is opened from the strip', async () => {
    const user = userEvent.setup();
    const app = await openPricing();
    await type(user, box('Base price', ATT), '18');
    await user.click((await kindStrip()).getByRole('link', { name: 'Server Service' }));
    expect(await screen.findByRole('dialog', { name: 'Discard your unsaved changes?' })).toBeInTheDocument();
    expect(app.location()).not.toContain('type=server');
  });

  it('lets a link move the app at once when nothing is typed', async () => {
    const user = userEvent.setup();
    const app = await openPricing();
    await user.click(rowOf(ATT).getByRole('link', { name: `Set pricing of ${ATT}` }));
    await waitFor(() => expect(app.location()).toBe('/products?view=edit&type=imei&id=5&part=pricing'));
    expect(question()).not.toBeInTheDocument();
  });

  it('asks the browser before a reload while a price or a position is typed, and stops once they are gone', async () => {
    const user = userEvent.setup();
    await openPricing();
    expect(reload()).toBe(false);
    await type(user, box('Base price', ATT), '18');
    expect(reload()).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(reload()).toBe(false);

    await user.click(screen.getByRole('checkbox', { name: 'Set Order' }));
    await screen.findByRole('textbox', { name: `Position of ${EE}` });
    await type(user, box('Position', EE), '7');
    expect(reload()).toBe(true);
  });
});

describe('the states', () => {
  it('says so, with a way back, when no service matches', async () => {
    const user = userEvent.setup();
    const app = await openProducts('/products?view=pricing&q=zzzz');
    expect(
      await screen.findByRole('heading', { name: 'No services match' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear the search' }));
    await screen.findByRole('table', { name: 'Price grid' });
    expect(app.location()).toBe('/products?view=pricing&type=imei');
  });

  it('offers to add a service on a kind with none, to a role that may add', async () => {
    answerEmptyGrid();
    await openProducts(IMEI);
    expect(
      await screen.findByRole('heading', { name: 'No services in this kind yet' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add a service' })).toHaveAttribute(
      'href',
      '/products?view=add&type=imei',
    );
  });

  it('does not offer to add a service to a role without catalog:create', async () => {
    answerEmptyGrid();
    await openProducts(IMEI, {
      permissions: ['catalog:read', 'pricing:read'],
    });
    expect(
      await screen.findByRole('heading', { name: 'No services in this kind yet' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Add a service' })).not.toBeInTheDocument();
  });

  it('says so, with a Retry, when the prices could not be loaded', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/services/price-grid', () =>
        problem(
          403,
          'FORBIDDEN',
          'Forbidden',
          'You need the pricing:read permission to read the price grid.',
        ),
      ),
    );
    await openProducts(IMEI);
    expect(
      await screen.findByText('Could not load the prices', undefined, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('You need the pricing:read permission to read the price grid.'),
    ).toBeInTheDocument();
    // The grid comes back; Retry asks again.
    mockServer.resetHandlers();
    mockServer.use(...groupHandlers);
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('table', { name: 'Price grid' })).toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('shows a reader the figures and no boxes, and keeps every button locked with the permission it needs', async () => {
    await openPricing(IMEI, { permissions: ['catalog:read', 'pricing:read'] });
    expect(screen.queryByRole('textbox', { name: /^Base price of/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /^Shop price of/ })).not.toBeInTheDocument();
    expect(rowOf(ATT).getByText('$17.28')).toBeInTheDocument();
    expect(rowOf(ATT).getByText('$25.99')).toBeInTheDocument();
    const save = screen.getByRole('button', SAVE);
    expect(save).toBeDisabled();
    expect(save).toHaveAttribute('title', 'You need the pricing:update permission');
    expect(screen.getByRole('button', { name: 'Bulk change…' })).toBeDisabled();
    const display = screen.getByRole('checkbox', { name: 'Display Enable/Disable Service' });
    expect(display).toBeDisabled();
    expect(display).toHaveAttribute('title', 'You need the catalog:update permission');
    expect(screen.getByRole('checkbox', { name: 'Set Order' })).toBeDisabled();
  });

  it('gives the base price only to a role that may change both the catalog and the prices', async () => {
    await openPricing(IMEI, {
      permissions: ['catalog:read', 'pricing:read', 'pricing:update', 'groups:read'],
    });
    // The rank and shop boxes open once the merchant groups are read.
    expect(await screen.findByRole('textbox', { name: `Wholesale price of ${ATT}` })).toBeEnabled();
    expect(box('Shop price', ATT)).toBeEnabled();
    expect(screen.queryByRole('textbox', { name: /^Base price of/ })).not.toBeInTheDocument();
  });

  it('keeps the rank and shop prices locked without groups:read, because the shop group cannot be named; the base price still opens', async () => {
    await openPricing(IMEI, {
      permissions: ['catalog:read', 'catalog:update', 'pricing:read', 'pricing:update'],
    });
    expect(box('Base price', ATT)).toBeEnabled();
    expect(screen.queryByRole('textbox', { name: /^Wholesale price of/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /^Shop price of/ })).not.toBeInTheDocument();
    // Without the group list the columns are named by their number.
    expect(screen.getByRole('columnheader', { name: 'Group #2 [USD]' })).toBeInTheDocument();
  });

  it('is not on the page for a role without pricing:read', async () => {
    await openProducts(IMEI, { permissions: ['catalog:read'] });
    // The registry opens the first view the role may use instead, and the row of views has no Pricing link.
    const views = await screen.findByRole('navigation', { name: 'Views' }, { timeout: 10_000 });
    expect(views).not.toHaveTextContent('Pricing');
    expect(screen.queryByRole('table', { name: 'Price grid' })).not.toBeInTheDocument();
  });
});
