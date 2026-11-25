// Tests for the All view of the Product / Services page, run through the whole app against the dev mock API: the list of a kind with the
// number, code, API and group of each service, the Quick Search box (text, group, API, quick filter) and the address that keeps them,
// the footer (page, page size), the two squares of a row (Status, Shop) with their locks, the "With selected" strip (Enable, Disable,
// Put on the shop, Take off the shop, Move to group, Delete) and the states (loading, empty, error). Rows the dev data cannot give
// (a service that needs attention, one the shop refuses) are answered by a handler of the test.
import { screen, waitFor, within, type BoundFunctions, type queries } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { createService, getService, importInventoryCodes, listCategories } from '../../../api';
import { productsPath } from '../../../lib/productsPath';
import { lastAllLink } from './lastAllAddress';
import { openProducts } from '../../../test/productsPage';
import { recordRequests } from '../../../test/requests';
import type { Service } from '../../../types';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
afterEach(() => vi.restoreAllMocks());

const ALL = '/products?view=all';
const SERVER = `${ALL}&type=server`;
const SERVER_NAMES = [
  'Chimera Tool 1 Month',
  'Miracle Box Credits x20',
  'NCK Dongle Credits x50',
  'UnlockTool 1-Day License',
  'Z3X Credits x10',
];

type Table = BoundFunctions<typeof queries>;

/** The table of the list, once the page has drawn it. */
async function servicesTable(): Promise<Table> {
  return within(await screen.findByRole('table', { name: 'Services' }, { timeout: 10_000 }));
}

/** The names in the Service Name column, in the order shown. */
const namesOf = (table: Table) =>
  table
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[1].firstElementChild?.textContent);

/** The names in a fixed order: the tests about what is listed do not depend on the order the server lists them in. */
const sorted = (names: (string | null | undefined)[]) => [...names].sort();

/** The row of the table that holds a service name. */
async function rowOf(table: Table, name: string) {
  return within((await table.findByText(name)).closest('tr') as HTMLElement);
}

/** The "Quick Search" box and the "With selected" strip. */
const searchBox = () => within(screen.getByRole('group', { name: 'Quick Search' }));
const strip = () => within(screen.getByRole('group', { name: /^With selected/ }));

/** The list requests sent so far. */
const listRequests = (requests: ReturnType<typeof recordRequests>) =>
  requests.sent().filter((sent) => sent.method === 'GET' && sent.url.pathname === '/admin/services');
const patches = (requests: ReturnType<typeof recordRequests>) =>
  requests.sent().filter((sent) => sent.method === 'PATCH');

const TOTAL = (count: number) => ({
  'x-total-count': String(count),
  'access-control-expose-headers': 'x-total-count',
});

/** A service row as the server sends it, with only what a test changes spelled out. */
function serviceRow(over: Partial<Service> & Pick<Service, 'id' | 'name'>): Service {
  return {
    code: `CODE-${over.id}`,
    type: 'imei',
    status: 'active',
    executionMode: 'auto',
    categoryId: 4,
    category: { id: 4, name: 'Carrier unlock' },
    basePrice: '10.0000',
    cost: '8.0000',
    costChangedFrom: null,
    ownCost: '0.0000',
    stockDelivery: false,
    stockAvailable: 0,
    minProfit: '1.0000',
    floorPrice: '9.0000',
    marginPct: '20.0000',
    belowFloor: false,
    slaMinutes: 60,
    minQty: 1,
    maxQty: 1,
    qtyOptions: [],
    allowCancel: false,
    allowVerify: false,
    verifyWindowH: 0,
    supplier: null,
    fallbackSupplier: null,
    attention: [],
    retailPrice: null,
    retailPriceSource: null,
    listingId: null,
    isListed: false,
    shopBlocked: null,
    ...over,
  };
}

/** Makes the server answer the list with these rows, whatever the question. */
function answerList(...rows: Service[]) {
  mockServer.use(
    http.get('*/admin/services', () => HttpResponse.json(rows, { headers: TOTAL(rows.length) })),
  );
}

describe('the list', () => {
  it('lists the services of the kind on the strip, with the number and code under each name', async () => {
    await openProducts(SERVER);
    const table = await servicesTable();
    await table.findByText('Z3X Credits x10');
    expect(sorted(namesOf(table))).toEqual(SERVER_NAMES);
    const row = await rowOf(table, 'Z3X Credits x10');
    expect(row.getByText('#15 · SRV-Z3X-10')).toBeInTheDocument();
    expect(row.getByText('Credits')).toBeInTheDocument();
    expect(row.getByText('Gulf Server Hub')).toBeInTheDocument();
    expect(screen.getByText('Results: 1 - 5 of 5')).toBeInTheDocument();
  });

  it('asks for the stored order, the one merchants see, and not for A to Z', async () => {
    const requests = recordRequests();
    await openProducts(SERVER);
    await servicesTable();
    const question = listRequests(requests).at(-1)?.url.searchParams;
    expect([question?.get('_sort'), question?.get('_order')]).toEqual(['sort', 'asc']);
  });

  it('draws the columns of the reference: Service Name, API, Group, Status, Shop and Actions', async () => {
    await openProducts(SERVER);
    const table = await servicesTable();
    for (const name of ['Service Name', 'API', 'Group', 'Status', 'Shop', 'Actions']) {
      expect(table.getByRole('columnheader', { name })).toBeInTheDocument();
    }
    expect(table.getByRole('checkbox', { name: 'Select all rows on this page' })).toBeInTheDocument();
  });

  it('keeps the Shop column as narrow as the Status column, so Service Name takes the width', async () => {
    await openProducts(SERVER);
    const table = await servicesTable();
    for (const name of ['Status', 'Shop']) {
      expect(table.getByRole('columnheader', { name })).toHaveClass('w-16', 'text-center');
    }
    const row = await rowOf(table, 'Z3X Credits x10');
    const cells = row.getAllByRole('cell');
    expect(cells[5]).toHaveClass('w-16');
    // Only the square: no words beside it to widen the column.
    expect(cells[5].textContent).toBe('');
  });

  it('opens the list of IMEI services when the address names no kind, with the API and the one it falls back to', async () => {
    await openProducts(ALL);
    const table = await servicesTable();
    const row = await rowOf(table, 'AT&T USA Premier Unlock');
    expect(table.getAllByRole('row')).toHaveLength(15); // the header and the fourteen IMEI services
    expect(row.getByText('Nordic GSM')).toBeInTheDocument();
    expect(row.getByText('then Bosphorus Unlock')).toBeInTheDocument();
  });

  it('links the pen of each row to the edit view of that service, on the same kind', async () => {
    await openProducts(SERVER);
    const table = await servicesTable();
    expect(await table.findByRole('link', { name: 'Edit Z3X Credits x10' })).toHaveAttribute(
      'href',
      productsPath({ view: 'edit', type: 'server', id: 15 }),
    );
  });

  it('writes the attention words in the critical colour, the fallback under the API and nothing for no API', async () => {
    answerList(
      serviceRow({
        id: 207,
        name: 'Unlock Tool 3 Months',
        code: 'UT-3M',
        supplier: { id: 1, name: 'Nordic GSM' },
        fallbackSupplier: { id: 6, name: 'Bosphorus Unlock' },
        attention: ['no_supplier', 'below_floor'],
      }),
      serviceRow({ id: 208, name: 'Plain Service', code: 'PL-1' }),
    );
    await openProducts(ALL);
    const table = await servicesTable();
    const row = await rowOf(table, 'Unlock Tool 3 Months');
    expect(row.getByText('#207 · UT-3M')).toBeInTheDocument();
    expect(row.getByText('No supplier')).toHaveClass('text-crit-fg');
    expect(row.getByText('Below floor')).toHaveClass('text-crit-fg');
    expect(row.getByText('Nordic GSM')).toBeInTheDocument();
    expect(row.getByText('then Bosphorus Unlock')).toBeInTheDocument();
    const plain = await rowOf(table, 'Plain Service');
    expect(plain.getByText('#208 · PL-1')).toBeInTheDocument();
    expect(plain.queryByText('No supplier')).not.toBeInTheDocument();
    expect(plain.getAllByRole('cell')[2].textContent).toBe(''); // the API cell is empty
  });

  it('says how many codes a service delivered from code stock holds, and not "No supplier"', async () => {
    answerList(
      serviceRow({
        id: 301,
        name: 'iTunes Gift Card 10',
        code: 'GC-ITUNES-10',
        type: 'server',
        stockDelivery: true,
        stockAvailable: 12,
      }),
      serviceRow({ id: 302, name: 'Plain Unlock', code: 'PL-2', attention: ['no_supplier'] }),
    );
    await openProducts(SERVER);
    const table = await servicesTable();
    const stock = await rowOf(table, 'iTunes Gift Card 10');
    expect(stock.getByText('Codes: 12 in stock')).toHaveClass('text-good-fg');
    expect(stock.queryByText('No supplier')).not.toBeInTheDocument();
    expect(stock.queryByText('No codes in stock')).not.toBeInTheDocument();
    // A service that is not delivered from stock keeps today's words.
    const plain = await rowOf(table, 'Plain Unlock');
    expect(plain.getByText('No supplier')).toHaveClass('text-crit-fg');
    expect(plain.queryByText(/in stock/)).not.toBeInTheDocument();
  });

  it('writes "No codes in stock" in the critical colour when the server says no supplier, and works nothing out itself', async () => {
    answerList(
      serviceRow({
        id: 303,
        name: 'Google Play 25',
        code: 'GC-GP-25',
        type: 'server',
        stockDelivery: true,
        stockAvailable: 0,
        attention: ['no_supplier'],
      }),
      serviceRow({
        id: 304,
        name: 'Steam 20',
        code: 'GC-ST-20',
        type: 'server',
        stockDelivery: true,
        stockAvailable: 0,
        supplier: { id: 1, name: 'Nordic GSM' },
      }),
      serviceRow({
        id: 305,
        name: 'PSN 50',
        code: 'GC-PSN-50',
        type: 'server',
        stockDelivery: true,
        stockAvailable: 0,
        executionMode: 'manual',
      }),
    );
    await openProducts(SERVER);
    const table = await servicesTable();
    const empty = await rowOf(table, 'Google Play 25');
    expect(empty.getByText('No codes in stock')).toHaveClass('text-crit-fg');
    expect(empty.queryByText('No supplier')).not.toBeInTheDocument();
    // The server did not flag these (a supplier is linked, or the service waits for a person anyway): an empty stock is only a number.
    const supplied = await rowOf(table, 'Steam 20');
    expect(supplied.getByText('Codes: 0 in stock')).not.toHaveClass('text-crit-fg');
    expect(supplied.queryByText('No codes in stock')).not.toBeInTheDocument();
    const manual = await rowOf(table, 'PSN 50');
    expect(manual.getByText('Codes: 0 in stock')).toBeInTheDocument();
  });

  it('counts the codes of a service with no supplier as its supply, and flags it only when the stock is empty', async () => {
    await signInAs();
    const credits = (await listCategories()).data.find((category) => category.name === 'Credits');
    if (!credits) throw new Error('The mock seed has no Credits group.');
    const body = {
      categoryId: credits.id,
      type: 'server',
      slaMinutes: 5,
      basePrice: '20.0000',
      stockDelivery: true,
    } as const;
    const steam = await createService({ ...body, name: 'Steam 20', code: 'GC-ST-20' });
    await createService({ ...body, name: 'PSN 50', code: 'GC-PSN-50' });
    await importInventoryCodes(steam.id, { codes: ['STEAM-0001-AAAA'] });
    await openProducts(SERVER);
    const table = await servicesTable();
    // Neither service has a supplier. The mock plays the server: one code is supply, so no no_supplier and the count is shown.
    const supplied = await rowOf(table, 'Steam 20');
    expect(supplied.getByText('Codes: 1 in stock')).toHaveClass('text-good-fg');
    expect(supplied.queryByText('No supplier')).not.toBeInTheDocument();
    expect(supplied.queryByText('No codes in stock')).not.toBeInTheDocument();
    const empty = await rowOf(table, 'PSN 50');
    expect(empty.getByText('No codes in stock')).toHaveClass('text-crit-fg');
    expect(empty.queryByText('No supplier')).not.toBeInTheDocument();
  });

  it('shows the stock of the services that hold codes in the dev data', async () => {
    await openProducts(SERVER);
    const table = await servicesTable();
    // Z3X Credits holds eighteen codes: four sold, one void, thirteen available. UnlockTool holds twelve: seven available.
    expect((await rowOf(table, 'Z3X Credits x10')).getByText('Codes: 13 in stock')).toBeInTheDocument();
    expect(
      (await rowOf(table, 'UnlockTool 1-Day License')).getByText('Codes: 7 in stock'),
    ).toBeInTheDocument();
    expect((await rowOf(table, 'Chimera Tool 1 Month')).queryByText(/in stock/)).not.toBeInTheDocument();
  });

  it('writes a switched-off service in the quiet colour with its square off', async () => {
    answerList(serviceRow({ id: 5, name: 'Old Service', status: 'disabled' }));
    await openProducts(ALL);
    const table = await servicesTable();
    expect(await table.findByText('Old Service')).toHaveClass('text-ink3');
    expect(table.getByRole('button', { name: 'Old Service active' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});

describe('Quick Search', () => {
  it('has a box with the group, the text, the API and the quick filter', async () => {
    await openProducts(SERVER);
    await servicesTable();
    const box = searchBox();
    expect(box.getByRole('combobox', { name: 'Group' })).toHaveValue('');
    expect(box.getByRole('searchbox', { name: 'Search service from any group' })).toHaveValue('');
    expect(box.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(box.getByRole('combobox', { name: 'API' })).toHaveValue('');
    expect(box.getByRole('combobox', { name: 'Show' })).toHaveValue('');
  });

  it('finds services by text on Search and on Enter, and keeps the text in the address', async () => {
    const user = userEvent.setup();
    const app = await openProducts(SERVER);
    await servicesTable();
    const input = searchBox().getByRole('searchbox', { name: 'Search service from any group' });
    await user.type(input, 'chimera');
    await user.click(searchBox().getByRole('button', { name: 'Search' }));
    await waitFor(() =>
      expect(app.location()).toBe(productsPath({ view: 'all', type: 'server', q: 'chimera' })),
    );
    await waitFor(async () => expect(namesOf(await servicesTable())).toEqual(['Chimera Tool 1 Month']));

    await user.clear(input);
    await user.type(input, 'unlock{Enter}');
    await waitFor(() =>
      expect(app.location()).toBe(productsPath({ view: 'all', type: 'server', q: 'unlock' })),
    );
    await waitFor(async () => expect(namesOf(await servicesTable())).toEqual(['UnlockTool 1-Day License']));
  });

  it('shows the text of the address in the box and says no service matches, with a way back', async () => {
    await openProducts(`${SERVER}&q=zzzz`);
    expect(await screen.findByText('No services match', undefined, { timeout: 10_000 })).toBeInTheDocument();
    expect(searchBox().getByRole('searchbox')).toHaveValue('zzzz');
    expect(screen.getByRole('link', { name: 'Clear the search' })).toHaveAttribute(
      'href',
      productsPath({ view: 'all', type: 'server' }),
    );
    expect(screen.getByText('Results: 0')).toBeInTheDocument();
  });

  it('offers the groups of the kind only, and lists the services of the group picked', async () => {
    const user = userEvent.setup();
    const app = await openProducts(SERVER);
    const select = searchBox().getByRole('combobox', { name: 'Group' });
    await within(select).findByRole('option', { name: 'Licenses' });
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Select Group', 'Credits', 'Licenses']);
    const licenses = (await listCategories()).data.find((category) => category.name === 'Licenses');
    await user.selectOptions(select, 'Licenses');
    await waitFor(() =>
      expect(app.location()).toBe(productsPath({ view: 'all', type: 'server', group: licenses?.id })),
    );
    await waitFor(async () =>
      expect(sorted(namesOf(await servicesTable()))).toEqual([
        'Chimera Tool 1 Month',
        'UnlockTool 1-Day License',
      ]),
    );
  });

  it('lists the services whose API is the one picked, asking the server for that supplier', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const app = await openProducts(ALL);
    const select = searchBox().getByRole('combobox', { name: 'API' });
    await within(select).findByRole('option', { name: 'Bosphorus Unlock' });
    await user.selectOptions(select, 'Bosphorus Unlock');
    await waitFor(() => expect(Number((select as HTMLSelectElement).value)).toBeGreaterThan(0));
    const supplierId = Number((select as HTMLSelectElement).value);
    await waitFor(() =>
      expect(app.location()).toBe(productsPath({ view: 'all', type: 'imei', api: supplierId })),
    );
    await waitFor(async () =>
      expect(sorted(namesOf(await servicesTable()))).toEqual([
        'EE UK Unlock',
        'Verizon USA Clean Unlock',
        'Vodafone UK iPhone Unlock',
        'Xiaomi Mi Account Clean',
      ]),
    );
    expect(listRequests(requests).at(-1)?.url.searchParams.get('supplierId')).toBe(String(supplierId));
  });

  it('asks for the switched-off services with the quick filter Switched off', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const app = await openProducts(ALL);
    await servicesTable();
    await user.selectOptions(searchBox().getByRole('combobox', { name: 'Show' }), 'Show: Switched off');
    await waitFor(() =>
      expect(app.location()).toBe(productsPath({ view: 'all', type: 'imei', show: 'disabled' })),
    );
    const table = await servicesTable();
    await table.findByText('Xiaomi Mi Account Clean');
    expect(listRequests(requests).at(-1)?.url.searchParams.get('status')).toBe('disabled');
    for (const square of table.getAllByRole('button', { name: / active$/ })) {
      expect(square).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it.each([
    ['Show: Needs attention', 'attention', 'needsAttention'],
    ['Show: Not on the shop', 'offshop', 'notOnShop'],
  ] as const)('asks the server for %s', async (label, show, param) => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const app = await openProducts(ALL);
    await servicesTable();
    await user.selectOptions(searchBox().getByRole('combobox', { name: 'Show' }), label);
    await waitFor(() => expect(app.location()).toBe(productsPath({ view: 'all', type: 'imei', show })));
    await waitFor(() => expect(listRequests(requests).at(-1)?.url.searchParams.get(param)).toBe('true'));
  });

  it('applies the text typed so far when a menu changes, and starts again at the first page', async () => {
    const user = userEvent.setup();
    const app = await openProducts(ALL);
    await servicesTable();
    await user.type(searchBox().getByRole('searchbox'), 'unlock');
    await user.selectOptions(searchBox().getByRole('combobox', { name: 'Show' }), 'Show: Switched off');
    await waitFor(() =>
      expect(app.location()).toBe(productsPath({ view: 'all', type: 'imei', q: 'unlock', show: 'disabled' })),
    );
  });

  it('refreshes the list with the tool at the right of the table', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openProducts(SERVER);
    await servicesTable();
    const before = listRequests(requests).length;
    await user.click(screen.getByRole('button', { name: 'Refresh the list' }));
    await waitFor(() => expect(listRequests(requests).length).toBeGreaterThan(before));
  });
});

describe('the footer', () => {
  it('shows the results, the page and the page size, and keeps the size in the address', async () => {
    const user = userEvent.setup();
    const app = await openProducts(SERVER);
    await servicesTable();
    const footer = within(screen.getByRole('navigation', { name: 'Pagination' }));
    const size = footer.getByRole('combobox', { name: 'Page size:' });
    expect(size).toHaveValue('50');
    await user.selectOptions(size, '25');
    await waitFor(() => expect(app.location()).toBe(productsPath({ view: 'all', type: 'server', size: 25 })));
    await user.selectOptions(size, '50');
    await waitFor(() => expect(app.location()).toBe(productsPath({ view: 'all', type: 'server' })));
  });

  it('asks the server for the rows of the page size in the address', async () => {
    const requests = recordRequests();
    await openProducts(`${SERVER}&size=25`);
    await servicesTable();
    const question = listRequests(requests).at(-1)?.url.searchParams;
    expect([question?.get('_start'), question?.get('_end')]).toEqual(['0', '25']);
  });

  it('goes back to the last page when the address names one past the end', async () => {
    const app = await openProducts(`${SERVER}&page=9`);
    await waitFor(() => expect(app.location()).toBe(productsPath({ view: 'all', type: 'server' })));
    const table = await servicesTable();
    await table.findByText('Z3X Credits x10');
  });
});

describe('the address kept for Back to All', () => {
  it('keeps the filters and the page size of each kind for the session, so the editor can return to them', async () => {
    const user = userEvent.setup();
    await openProducts(`${SERVER}&q=chimera&size=25`);
    await servicesTable();
    await waitFor(() =>
      expect(lastAllLink('server')).toBe(
        productsPath({ view: 'all', type: 'server', q: 'chimera', size: 25 }),
      ),
    );
    // A change of the list is kept too; a kind that was not opened still goes to the plain list.
    await user.selectOptions(searchBox().getByRole('combobox', { name: 'Show' }), 'Show: Switched off');
    await waitFor(() =>
      expect(lastAllLink('server')).toBe(
        productsPath({ view: 'all', type: 'server', q: 'chimera', size: 25, show: 'disabled' }),
      ),
    );
    expect(lastAllLink('imei')).toBe(productsPath({ view: 'all', type: 'imei' }));
  });
});

describe('the Status square', () => {
  it('switches a service off and on, with the server’s words in a toast', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openProducts(SERVER);
    const table = await servicesTable();
    const square = await table.findByRole('button', { name: 'Z3X Credits x10 active' });
    expect(square).toHaveAttribute('aria-pressed', 'true');
    await user.click(square);
    expect(await screen.findByText('Z3X Credits x10 disabled')).toBeInTheDocument();
    expect(patches(requests).map((sent) => [sent.url.pathname, sent.body])).toEqual([
      ['/admin/services/15', { status: 'disabled' }],
    ]);
    await waitFor(() =>
      expect(table.getByRole('button', { name: 'Z3X Credits x10 active' })).toHaveAttribute(
        'aria-pressed',
        'false',
      ),
    );
    expect((await getService(15)).status).toBe('disabled');

    await user.click(table.getByRole('button', { name: 'Z3X Credits x10 active' }));
    expect(await screen.findByText('Z3X Credits x10 enabled')).toBeInTheDocument();
    expect((await getService(15)).status).toBe('active');
  });

  it('shows the server’s refusal and leaves the square where it was', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/services/:id', () =>
        problem(409, 'SERVICE_IN_USE', 'Service in use', 'It has open orders being sent.'),
      ),
    );
    await openProducts(SERVER);
    const table = await servicesTable();
    const square = await table.findByRole('button', { name: 'Z3X Credits x10 active' });
    await user.click(square);
    // The error toast gives the server's title, then its words with the request id after them.
    expect(await screen.findByText('Service in use')).toBeInTheDocument();
    expect(screen.getByText(/^It has open orders being sent./)).toBeInTheDocument();
    await waitFor(() => expect(square).toBeEnabled());
    expect(square).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('the Shop square', () => {
  it('takes a service with a shop page off the shop and puts it back', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openProducts(ALL);
    const table = await servicesTable();
    const square = await table.findByRole('button', { name: 'EE UK Unlock on the shop' });
    expect(square).toHaveAttribute('aria-pressed', 'true');
    await user.click(square);
    expect(await screen.findByText('EE UK Unlock is off the shop')).toBeInTheDocument();
    expect(patches(requests).map((sent) => [sent.url.pathname, sent.body])).toEqual([
      ['/admin/service-listings/9', { isListed: false }],
    ]);
    await waitFor(() =>
      expect(table.getByRole('button', { name: 'EE UK Unlock on the shop' })).toHaveAttribute(
        'aria-pressed',
        'false',
      ),
    );
  });

  it('writes the server’s reason under the name, gives the locked square the same words, and keeps it locked', async () => {
    answerList(
      serviceRow({
        id: 31,
        name: 'Closed Service',
        shopBlocked: 'b2b_only',
        listingId: null,
        isListed: false,
      }),
      serviceRow({ id: 32, name: 'Open Service' }),
    );
    await openProducts(ALL);
    const table = await servicesTable();
    const closed = await rowOf(table, 'Closed Service');
    const cells = closed.getAllByRole('cell');
    // The second line of the name cell, after the number and the code; nothing is written in the Shop cell.
    expect(within(cells[1]).getByText('Category closed to shop buyers')).toBeInTheDocument();
    expect(cells[1].textContent).toContain('#31 · CODE-31 · Category closed to shop buyers');
    expect(cells[5].textContent).toBe('');
    const square = closed.getByRole('button', { name: 'Closed Service on the shop' });
    expect(square).toBeDisabled();
    expect(square).toHaveAttribute('title', 'Category closed to shop buyers');
    const open = await rowOf(table, 'Open Service');
    expect(open.getByRole('button', { name: 'Open Service on the shop' })).toBeEnabled();
    expect(open.queryByText('Category closed to shop buyers')).not.toBeInTheDocument();
  });
});

describe('the permission locks', () => {
  it('shows a role that only reads the list no Shop column and squares that say what is missing', async () => {
    await openProducts(SERVER, { permissions: ['catalog:read'] });
    const table = await servicesTable();
    const square = await table.findByRole('button', { name: 'Z3X Credits x10 active' });
    expect(table.queryByRole('columnheader', { name: 'Shop' })).not.toBeInTheDocument();
    expect(square).toBeDisabled();
    expect(square).toHaveAttribute('title', 'You need the catalog:update permission');
    const api = searchBox().getByRole('combobox', { name: 'API' });
    expect(api).toBeDisabled();
    expect(api).toHaveAttribute('title', 'You need the suppliers:read permission');
    const show = searchBox().getByRole('combobox', { name: 'Show' });
    expect(within(show).queryByRole('option', { name: 'Show: Not on the shop' })).not.toBeInTheDocument();
  });

  it('locks the buttons of the strip with the permission each needs', async () => {
    const user = userEvent.setup();
    await openProducts(SERVER, { permissions: ['catalog:read'] });
    const table = await servicesTable();
    await user.click(await table.findByRole('checkbox', { name: 'Select row 15' }));
    expect(strip().getByRole('button', { name: 'Disable' })).toHaveAttribute(
      'title',
      'You need the catalog:update permission',
    );
    expect(strip().getByRole('button', { name: 'Delete' })).toBeDisabled();
    expect(strip().getByRole('button', { name: 'Delete' })).toHaveAttribute(
      'title',
      'You need the catalog:delete permission',
    );
    expect(strip().queryByRole('button', { name: 'Put on the shop' })).not.toBeInTheDocument();
    expect(strip().queryByRole('button', { name: 'Take off the shop' })).not.toBeInTheDocument();
  });
});

describe('With selected', () => {
  it('keeps the buttons off until a row is ticked, and checks and unchecks every row of the page', async () => {
    const user = userEvent.setup();
    await openProducts(SERVER);
    const table = await servicesTable();
    await table.findByText('Z3X Credits x10');
    expect(strip().getByRole('button', { name: 'Disable' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Check All' }));
    expect(screen.getByText('With selected (5):')).toBeInTheDocument();
    for (const id of [15, 16, 17, 18, 19]) {
      expect(table.getByRole('checkbox', { name: `Select row ${id}` })).toBeChecked();
    }
    await user.click(screen.getByRole('button', { name: 'Uncheck All' }));
    expect(screen.getByText('With selected:')).toBeInTheDocument();
    expect(table.getByRole('checkbox', { name: 'Select row 15' })).not.toBeChecked();
  });

  it('leaves the ticks behind when the list changes', async () => {
    const user = userEvent.setup();
    await openProducts(SERVER);
    const table = await servicesTable();
    await user.click(await table.findByRole('checkbox', { name: 'Select row 15' }));
    expect(screen.getByText('With selected (1):')).toBeInTheDocument();
    await user.selectOptions(searchBox().getByRole('combobox', { name: 'Show' }), 'Show: Needs attention');
    await waitFor(() => expect(screen.queryByText('With selected (1):')).not.toBeInTheDocument());
  });

  it('disables the ticked services one after the other and tells how many', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openProducts(SERVER);
    const table = await servicesTable();
    await user.click(await table.findByRole('checkbox', { name: 'Select row 15' }));
    await user.click(table.getByRole('checkbox', { name: 'Select row 18' }));
    await user.click(strip().getByRole('button', { name: 'Disable' }));
    expect(await screen.findByText('2 services disabled')).toBeInTheDocument();
    // One after the other, in the order of the list; the two are NCK Dongle Credits x50 (18) and Z3X Credits x10 (15).
    expect(
      patches(requests)
        .map((sent) => [sent.url.pathname, sent.body])
        .sort(([a], [b]) => String(a).localeCompare(String(b))),
    ).toEqual([
      ['/admin/services/15', { status: 'disabled' }],
      ['/admin/services/18', { status: 'disabled' }],
    ]);
    // The services it covered are unticked.
    await waitFor(() => expect(table.getByRole('checkbox', { name: 'Select row 15' })).not.toBeChecked());
  });

  it('moves the ticked services to the group picked', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openProducts(SERVER);
    const table = await servicesTable();
    await user.click(await table.findByRole('checkbox', { name: 'Select row 15' }));
    const select = strip().getByRole('combobox', { name: 'Move to group' });
    await within(select).findByRole('option', { name: 'Licenses' });
    expect(strip().getByRole('button', { name: 'Apply' })).toBeDisabled();
    await user.selectOptions(select, 'Licenses');
    await user.click(strip().getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText('1 service moved to Licenses')).toBeInTheDocument();
    expect(patches(requests).map((sent) => [sent.url.pathname, sent.body])).toEqual([
      ['/admin/services/15', { categoryId: expect.any(Number) }],
    ]);
    const row = await rowOf(table, 'Z3X Credits x10');
    await waitFor(() => expect(row.getByText('Licenses')).toBeInTheDocument());
  });

  it('asks before it deletes, and lists a service the server refuses to delete', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openProducts(SERVER);
    const table = await servicesTable();
    await user.click(await table.findByRole('checkbox', { name: 'Select row 15' }));
    await user.click(strip().getByRole('button', { name: 'Delete' }));
    const question = within(await screen.findByRole('dialog', { name: 'Delete 1 service?' }));

    // Cancel: nothing is sent.
    await user.click(question.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Delete 1 service?' })).not.toBeInTheDocument(),
    );
    expect(requests.sent().filter((sent) => sent.method === 'DELETE')).toHaveLength(0);

    await user.click(strip().getByRole('button', { name: 'Delete' }));
    await user.click(
      within(await screen.findByRole('dialog', { name: 'Delete 1 service?' })).getByRole('button', {
        name: 'Delete',
      }),
    );
    const summary = within(await screen.findByRole('dialog', { name: '0 of 1 service deleted' }));
    expect(summary.getByText(/has 38 orders, so it cannot be deleted\./)).toBeInTheDocument();
    expect(
      requests
        .sent()
        .filter((sent) => sent.method === 'DELETE')
        .map((sent) => sent.url.pathname),
    ).toEqual(['/admin/services/15']);
    expect((await getService(15)).name).toBe('Z3X Credits x10');
  });

  it('sends the ticked services that have no shop page to one publish run and opens it', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const app = await openProducts(SERVER);
    const table = await servicesTable();
    await user.click(await table.findByRole('checkbox', { name: 'Select row 15' }));
    await user.click(strip().getByRole('button', { name: 'Put on the shop' }));
    await waitFor(() => expect(app.location()).toMatch(/^\/products\?view=publish&type=server&run=\d+$/));
    const created = requests
      .sent()
      .filter((sent) => sent.method === 'POST' && sent.url.pathname === '/admin/publish-runs');
    expect(created.map((sent) => sent.body)).toEqual([{ scope: { kind: 'services', serviceIds: [15] } }]);
  });

  it('takes the ticked services off the shop', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openProducts(ALL);
    const table = await servicesTable();
    await user.click(await table.findByRole('checkbox', { name: 'Select row 9' }));
    await user.click(strip().getByRole('button', { name: 'Take off the shop' }));
    expect(await screen.findByText('1 service taken off the shop')).toBeInTheDocument();
    expect(patches(requests).map((sent) => [sent.url.pathname, sent.body])).toEqual([
      ['/admin/service-listings/9', { isListed: false }],
    ]);
  });
});

describe('the states', () => {
  it('says no service is in the kind yet, with a link to +Add Service', async () => {
    answerList();
    await openProducts(ALL);
    expect(
      await screen.findByText('No services in this kind yet', undefined, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+Add Service' })).toHaveAttribute(
      'href',
      productsPath({ view: 'add', type: 'imei' }),
    );
    // No rows, so no strip under the table.
    expect(screen.queryByRole('group', { name: /^With selected/ })).not.toBeInTheDocument();
  });

  it('shows the server’s refusal with a Retry that asks again', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/services', () => problem(500, 'BOOM', 'Server error', 'The list could not be read.')),
    );
    const requests = recordRequests();
    await openProducts(ALL);
    expect(
      await screen.findByText('Could not load the services', undefined, { timeout: 15_000 }),
    ).toBeInTheDocument();
    const before = listRequests(requests).length;
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(listRequests(requests).length).toBeGreaterThan(before));
  });
});
