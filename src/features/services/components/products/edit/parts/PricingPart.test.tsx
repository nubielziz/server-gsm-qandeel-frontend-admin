// Tests for the Set Pricing part of the edit view, opened through the whole page against the dev mock API: the credit and the minimum profit with
// the cost, floor and margin the server worked out, its refusal of a price under the floor (shown under the box), what a save sends (only
// what changed, the price before the rank prices), the fixed price of each rank with what it pays now, the retail price the form loaded
// (`retailPriceSeen`, always sent back so the server keeps a retail price that moved after the part opened), and what a role may change.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { getService } from '../../../../api';
import { servicesStore } from '../../../../mocks/store';
import { groupHandlers } from '../../../../mocks/testGroups';
import { openProducts, viewLinks } from '../../../../test/productsPage';
import { recordRequests } from '../../../../test/requests';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
// The accounts feature serves the rank list; these tests bring their own copy of it.
beforeEach(() => mockServer.use(...groupHandlers));
afterEach(() => vi.restoreAllMocks());

type User = ReturnType<typeof userEvent.setup>;

const AT_T = 5; // IMEI-ATT-USA, "AT&T USA Premier Unlock": cost 13.50, base 17.28, minimum profit 0.81, VIP fixed at 15.90
const CHIMERA = 17; // SRV-CHM-1M, "Chimera Tool 1 Month": the supplier moved its cost from 17.00 to 20.99
const RETAIL = 9;

/** Clears a box and types into it. */
async function retype(user: User, box: HTMLElement, text: string) {
  await user.clear(box);
  await user.type(box, text);
}

/** The Set Pricing part once it is drawn: its form and the pinned bar. */
async function openedPart() {
  const form = await screen.findByRole('form', { name: 'Set Pricing' }, { timeout: 10_000 });
  // The pinned bar with Save sits beside the form (its button names the form), in the same frame.
  const part = form.closest<HTMLElement>('.view-frame');
  if (!part) throw new Error('The Set Pricing form is not inside its frame.');
  return within(part);
}

/** Opens the part for a service, signed in as the Owner (or with these permissions), and returns the part: its form and the pinned bar. */
async function openPricing(id = AT_T, type = 'imei', options: { permissions?: string[] } = {}) {
  await openProducts(`/products?view=edit&type=${type}&id=${id}&part=pricing`, options);
  return openedPart();
}

describe('Set Pricing: the price', () => {
  it('shows the credit, the minimum profit and the cost, floor and margin the server worked out', async () => {
    const form = await openPricing();
    expect(form.getByRole('textbox', { name: 'Credit' })).toHaveValue('17.28');
    expect(form.getByRole('textbox', { name: 'Minimum profit' })).toHaveValue('0.81');
    expect(form.getByText('Supplier cost')).toBeInTheDocument();
    expect(form.getByText('$13.50')).toBeInTheDocument();
    expect(form.getByText('$14.31')).toBeInTheDocument();
    expect(form.getByText('21.9%')).toBeInTheDocument();
  });

  it('shows what the supplier changed the cost from', async () => {
    const form = await openPricing(CHIMERA, 'server');
    expect(form.getByText('(was $17.00)')).toBeInTheDocument();
    expect(form.getByText('$20.99')).toBeInTheDocument();
  });

  it('keeps Save off until something changes, and off again when the change is typed back', async () => {
    const user = userEvent.setup();
    const form = await openPricing();
    const save = form.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();
    const credit = form.getByRole('textbox', { name: 'Credit' });
    await retype(user, credit, '16');
    expect(save).toBeEnabled();
    await retype(user, credit, '17.28');
    expect(save).toBeDisabled();
  });

  it('saves a new credit, says so, and reads the floor and margin from the server again', async () => {
    const user = userEvent.setup();
    const form = await openPricing();
    await retype(user, form.getByRole('textbox', { name: 'Credit' }), '15');
    await user.click(form.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Price updated')).toBeInTheDocument();
    expect(
      screen.getByText('AT&T USA Premier Unlock is now $15.00. Floor $14.31, margin 10%. New orders use it.'),
    ).toBeInTheDocument();
    expect((await getService(AT_T)).basePrice).toBe('15.0000');
    expect(await form.findByText('Saved')).toBeInTheDocument();
    expect(form.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('shows the server’s refusal of a credit under the floor under the box and keeps the edit', async () => {
    const user = userEvent.setup();
    const form = await openPricing();
    const credit = form.getByRole('textbox', { name: 'Credit' });
    await retype(user, credit, '14');
    await user.click(form.getByRole('button', { name: 'Save' }));
    expect(
      await form.findByText('Below the floor. Cost $13.50 plus minimum profit $0.81 is $14.31.'),
    ).toBeInTheDocument();
    expect(credit).toHaveAttribute('aria-invalid', 'true');
    expect(credit).toHaveValue('14');
    expect(form.getByRole('button', { name: 'Save' })).toBeEnabled();
    expect((await getService(AT_T)).basePrice).toBe('17.2800');
  });

  it('keeps a typed mistake in the browser and asks for a price', async () => {
    const user = userEvent.setup();
    const form = await openPricing();
    await retype(user, form.getByRole('textbox', { name: 'Credit' }), 'abc');
    await user.click(form.getByRole('button', { name: 'Save' }));
    expect(await form.findByText('Enter a price greater than zero.')).toBeInTheDocument();
    expect((await getService(AT_T)).basePrice).toBe('17.2800');
  });

  it('sends only what changed: a new minimum profit raises the floor and the part says the credit is under it', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const form = await openPricing();
    await retype(user, form.getByRole('textbox', { name: 'Minimum profit' }), '5');
    await user.click(form.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(/Floor \$18\.50, margin 21\.9%\./)).toBeInTheDocument();
    expect(screen.getByText(/It is still under the floor/)).toBeInTheDocument();
    expect(await getService(AT_T)).toMatchObject({
      basePrice: '17.2800',
      minProfit: '5.0000',
      belowFloor: true,
    });
    const patches = requests.sent().filter((one) => one.method === 'PATCH');
    expect(patches.map((one) => one.body)).toEqual([{ minProfit: '5.0000' }]);
    expect(await form.findByText('$18.50')).toBeInTheDocument();
    expect(form.getByText('Under the floor: orders are charged the floor price.')).toBeInTheDocument();
  });
});

describe('Set Pricing: the rank prices', () => {
  it('lists the ranks with their fixed prices and what each pays now', async () => {
    const form = await openPricing();
    expect(await form.findByRole('textbox', { name: 'Fixed price for VIP' })).toHaveValue('15.90');
    expect(form.getByRole('textbox', { name: 'Fixed price for Standard' })).toHaveValue('');
    expect(form.getByRole('textbox', { name: 'Fixed price for Wholesale' })).toHaveValue('');
    // VIP pays its fixed price; Wholesale follows the base price less its 4%; Standard has no discount.
    expect(form.getByText('$15.90')).toBeInTheDocument();
    expect(form.getByText('Base price less 4%')).toBeInTheDocument();
    expect(form.getByText('Base price')).toBeInTheDocument();
  });

  it('saves a rank price and shows it as what the rank pays now', async () => {
    const user = userEvent.setup();
    const form = await openPricing();
    await user.type(await form.findByRole('textbox', { name: 'Fixed price for Wholesale' }), '16.25');
    await user.click(form.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Group prices saved')).toBeInTheDocument();
    expect((await getService(AT_T)).groupPrices).toEqual([
      { groupId: 2, price: '16.2500' },
      { groupId: 3, price: '15.9000' },
    ]);
    expect(await form.findByText('$16.25')).toBeInTheDocument();
    expect(form.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('removes a rank price when its box is emptied', async () => {
    const user = userEvent.setup();
    const form = await openPricing();
    await user.clear(await form.findByRole('textbox', { name: 'Fixed price for VIP' }));
    await user.click(form.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Group prices saved')).toBeInTheDocument();
    expect((await getService(AT_T)).groupPrices).toEqual([]);
  });

  it('asks for a price above zero under the box', async () => {
    const user = userEvent.setup();
    const form = await openPricing();
    await user.type(await form.findByRole('textbox', { name: 'Fixed price for Standard' }), '0');
    await user.click(form.getByRole('button', { name: 'Save' }));
    expect(await form.findByText('Enter a price greater than zero.')).toBeInTheDocument();
    expect(form.getByRole('textbox', { name: 'Fixed price for Standard' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect((await getService(AT_T)).groupPrices).toHaveLength(1);
  });
});

/** Adds the storefront's retail group to the mock groups and sets what the service has saved for it (`null`: nothing). */
async function withRetailGroup(price: string | null) {
  const stores = await servicesStore();
  stores.groups.push({ id: RETAIL, name: 'Storefront retail', kind: 'b2c_retail', discountPercent: 0 });
  if (price !== null) stores.services.find(String(AT_T))?.groupPrices.push({ groupId: RETAIL, price });
}

/** Moves the stored retail price the way a follow pass or a publish does, behind the open part's back. */
async function moveRetailTo(price: string) {
  const service = (await servicesStore()).services.find(String(AT_T));
  if (!service) throw new Error('No service 5.');
  service.groupPrices = [
    ...service.groupPrices.filter((row) => row.groupId !== RETAIL),
    { groupId: RETAIL, price },
  ];
}

/** The body of the group prices save the part sent. */
function savedBody(requests: ReturnType<typeof recordRequests>) {
  const puts = requests
    .sent()
    .filter((one) => one.method === 'PUT' && one.url.pathname.endsWith('/group-prices'));
  expect(puts).toHaveLength(1);
  return puts[0]?.body;
}

describe('Set Pricing: the retail price the part loaded', () => {
  it('has no box for the retail group: its price lives in Retail Purchase', async () => {
    await withRetailGroup('19.9900');
    const form = await openPricing();
    expect(await form.findByRole('textbox', { name: 'Fixed price for VIP' })).toBeInTheDocument();
    expect(form.queryByRole('textbox', { name: /Storefront retail/ })).not.toBeInTheDocument();
  });

  it('sends the retail figure it loaded back, and the server keeps a price that moved since', async () => {
    await withRetailGroup('19.9900');
    const user = userEvent.setup();
    const form = await openPricing();
    await form.findByRole('textbox', { name: 'Fixed price for VIP' });
    await moveRetailTo('20.4900');
    const requests = recordRequests();
    await user.type(form.getByRole('textbox', { name: 'Fixed price for Wholesale' }), '16.25');
    await user.click(form.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Group prices saved')).toBeInTheDocument();
    expect(savedBody(requests)).toEqual({
      prices: [
        { groupId: 2, price: '16.2500' },
        { groupId: 3, price: '15.9000' },
        { groupId: RETAIL, price: '19.9900' },
      ],
      retailPriceSeen: '19.9900',
    });
    expect((await getService(AT_T)).groupPrices).toEqual([
      { groupId: 2, price: '16.2500' },
      { groupId: 3, price: '15.9000' },
      { groupId: RETAIL, price: '20.4900' },
    ]);
  });

  it('sends null when the service had no retail price, and the server keeps one that was set since', async () => {
    await withRetailGroup(null);
    const user = userEvent.setup();
    const form = await openPricing();
    await form.findByRole('textbox', { name: 'Fixed price for VIP' });
    await moveRetailTo('18.0000');
    const requests = recordRequests();
    await user.type(form.getByRole('textbox', { name: 'Fixed price for Wholesale' }), '16.25');
    await user.click(form.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Group prices saved')).toBeInTheDocument();
    expect(savedBody(requests)).toEqual({
      prices: [
        { groupId: 2, price: '16.2500' },
        { groupId: 3, price: '15.9000' },
      ],
      retailPriceSeen: null,
    });
    expect((await getService(AT_T)).groupPrices).toContainEqual({ groupId: RETAIL, price: '18.0000' });
  });

  it('sends the key even when the menu lists no retail group', async () => {
    const user = userEvent.setup();
    const form = await openPricing();
    await form.findByRole('textbox', { name: 'Fixed price for VIP' });
    const requests = recordRequests();
    await user.type(form.getByRole('textbox', { name: 'Fixed price for Wholesale' }), '16.25');
    await user.click(form.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Group prices saved')).toBeInTheDocument();
    expect(savedBody(requests)).toEqual({
      prices: [
        { groupId: 2, price: '16.2500' },
        { groupId: 3, price: '15.9000' },
      ],
      retailPriceSeen: null,
    });
  });
});

describe('Set Pricing: one Save for the whole part', () => {
  it('saves the credit first and then the rank prices, each through its own route', async () => {
    const user = userEvent.setup();
    const form = await openPricing();
    await form.findByRole('textbox', { name: 'Fixed price for VIP' });
    const requests = recordRequests();
    await retype(user, form.getByRole('textbox', { name: 'Credit' }), '16');
    await user.type(form.getByRole('textbox', { name: 'Fixed price for Wholesale' }), '16.25');
    await user.click(form.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Price updated')).toBeInTheDocument();
    expect(await screen.findByText('Group prices saved')).toBeInTheDocument();
    const writes = requests
      .sent()
      .filter((one) => one.method !== 'GET')
      .map((one) => `${one.method} ${one.url.pathname}`);
    expect(writes).toEqual([`PATCH /admin/services/${AT_T}`, `PUT /admin/services/${AT_T}/group-prices`]);
    expect(await getService(AT_T)).toMatchObject({ basePrice: '16.0000' });
  });

  it('stops at a refused credit: the rank prices are not sent and the typed price stays', async () => {
    const user = userEvent.setup();
    const form = await openPricing();
    await form.findByRole('textbox', { name: 'Fixed price for VIP' });
    const requests = recordRequests();
    await retype(user, form.getByRole('textbox', { name: 'Credit' }), '14');
    const wholesale = form.getByRole('textbox', { name: 'Fixed price for Wholesale' });
    await user.type(wholesale, '16.25');
    await user.click(form.getByRole('button', { name: 'Save' }));
    expect(
      await form.findByText('Below the floor. Cost $13.50 plus minimum profit $0.81 is $14.31.'),
    ).toBeInTheDocument();
    expect(requests.sent().filter((one) => one.method === 'PUT')).toHaveLength(0);
    expect(wholesale).toHaveValue('16.25');
    expect((await getService(AT_T)).groupPrices).toHaveLength(1);
  });
});

describe('Set Pricing: a record that moved while the editor was away', () => {
  it('opens on the fresh record, so a rank price saved elsewhere survives a later save', async () => {
    const user = userEvent.setup();
    // The editor reads the service once; the record stays in the cache when the editor is left for the Pricing view.
    const first = await openPricing();
    await first.findByRole('textbox', { name: 'Fixed price for VIP' });
    await user.click((await viewLinks()).getByRole('link', { name: 'Pricing' }));
    const toEditor = () =>
      screen
        .queryAllByRole('link')
        .find(
          (link) => link.getAttribute('href') === `/products?view=edit&type=imei&id=${AT_T}&part=pricing`,
        );
    await waitFor(() => expect(toEditor()).toBeDefined(), { timeout: 10_000 });

    // Another staff member saves the Wholesale price of the service, so the cached record is old now.
    (await servicesStore()).services.find(String(AT_T))?.groupPrices.push({ groupId: 2, price: '16.2500' });

    // The editor opens again from the grid: it must not draw the part from the cached copy.
    await user.click(toEditor() as HTMLElement);
    const form = await openedPart();
    expect(await form.findByRole('textbox', { name: 'Fixed price for Wholesale' })).toHaveValue('16.25');

    const requests = recordRequests();
    await user.type(form.getByRole('textbox', { name: 'Fixed price for Standard' }), '15');
    await user.click(form.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Group prices saved')).toBeInTheDocument();
    const prices = [
      { groupId: 1, price: '15.0000' },
      { groupId: 2, price: '16.2500' },
      { groupId: 3, price: '15.9000' },
    ];
    expect(savedBody(requests)).toEqual({ prices, retailPriceSeen: null });
    expect((await getService(AT_T)).groupPrices).toEqual(prices);
  });
});

describe('Set Pricing: what a role may change', () => {
  it('shows every box off with the missing permission named for a role that may only read', async () => {
    const form = await openPricing(AT_T, 'imei', {
      permissions: ['catalog:read', 'pricing:read', 'groups:read'],
    });
    const credit = form.getByRole('textbox', { name: 'Credit' });
    expect(credit).toBeDisabled();
    expect(credit).toHaveAttribute('title', 'You need the catalog:update and pricing:update permission');
    const vip = await form.findByRole('textbox', { name: 'Fixed price for VIP' });
    expect(vip).toBeDisabled();
    expect(vip).toHaveAttribute('title', 'You need the pricing:update permission');
    expect(form.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('lets a role with pricing:update change the rank prices but not the credit', async () => {
    const user = userEvent.setup();
    const form = await openPricing(AT_T, 'imei', {
      permissions: ['catalog:read', 'pricing:read', 'pricing:update', 'groups:read'],
    });
    const credit = form.getByRole('textbox', { name: 'Credit' });
    expect(credit).toBeDisabled();
    expect(credit).toHaveAttribute('title', 'You need the catalog:update permission');
    await user.type(await form.findByRole('textbox', { name: 'Fixed price for Wholesale' }), '16.25');
    expect(form.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('says what is missing instead of the table for a role without groups:read, and still edits the credit', async () => {
    const user = userEvent.setup();
    const form = await openPricing(AT_T, 'imei', {
      permissions: ['catalog:read', 'catalog:update', 'pricing:read', 'pricing:update'],
    });
    expect(
      await form.findByText('You need the groups:read permission to see the merchant ranks.'),
    ).toBeInTheDocument();
    expect(form.queryByRole('table', { name: 'Fixed prices per rank' })).not.toBeInTheDocument();
    await retype(user, form.getByRole('textbox', { name: 'Credit' }), '16');
    expect(form.getByRole('button', { name: 'Save' })).toBeEnabled();
  });
});
