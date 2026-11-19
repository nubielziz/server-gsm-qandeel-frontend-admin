// Tests for the retail figure the Group prices dialog sends back (`retailPriceSeen`): the figure it loaded, always, so the server
// can keep a retail price that moved after the dialog opened and still write one that staff typed. The mock plays that rule.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { getService } from '../api';
import { servicesStore } from '../mocks/store';
import { groupHandlers } from '../mocks/testGroups';
import { openServices, pickFromRowMenu } from '../test/servicesPage';
import { recordRequests } from '../test/requests';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
beforeEach(() => mockServer.use(...groupHandlers));
afterEach(() => vi.restoreAllMocks());

const RETAIL = 9;
const AT_T = '5';

/** Adds the storefront's retail group to the mock groups and sets what service 5 has saved for it (`null`: nothing). */
async function withRetailGroup(price: string | null) {
  const stores = await servicesStore();
  stores.groups.push({ id: RETAIL, name: 'Storefront retail', kind: 'b2c_retail', discountPercent: 0 });
  if (price !== null) stores.services.find(AT_T)?.groupPrices.push({ groupId: RETAIL, price });
}

/** Moves the stored retail price the way a follow pass or a publish does, behind the open dialog's back. */
async function moveRetailTo(price: string) {
  const service = (await servicesStore()).services.find(AT_T);
  if (!service) throw new Error('No service 5.');
  service.groupPrices = [
    ...service.groupPrices.filter((row) => row.groupId !== RETAIL),
    { groupId: RETAIL, price },
  ];
}

async function openGroupPrices(user: ReturnType<typeof userEvent.setup>) {
  await openServices();
  await pickFromRowMenu(user, 'AT&T USA Premier Unlock', 'Group prices…');
  return within(await screen.findByRole('dialog', { name: 'Group prices' }));
}

/** The body of the group prices save the dialog sent. */
function savedBody(requests: ReturnType<typeof recordRequests>) {
  const puts = requests
    .sent()
    .filter((one) => one.method === 'PUT' && one.url.pathname.endsWith('/group-prices'));
  expect(puts).toHaveLength(1);
  return puts[0]?.body;
}

describe('Group prices: the retail price the dialog loaded', () => {
  it('sends the retail figure it loaded and the server keeps a price that moved since', async () => {
    await withRetailGroup('19.9900');
    const user = userEvent.setup();
    const dialog = await openGroupPrices(user);
    expect(await dialog.findByRole('textbox', { name: 'Storefront retail' })).toHaveValue('19.99');
    await moveRetailTo('20.4900');
    const requests = recordRequests();
    await user.type(dialog.getByRole('textbox', { name: 'Wholesale' }), '16.25');
    await user.click(dialog.getByRole('button', { name: 'Save group prices' }));
    expect(await screen.findByText('Group prices saved')).toBeInTheDocument();
    expect(savedBody(requests)).toEqual({
      prices: [
        { groupId: 2, price: '16.2500' },
        { groupId: 3, price: '15.9000' },
        { groupId: RETAIL, price: '19.9900' },
      ],
      retailPriceSeen: '19.9900',
    });
    expect((await getService(5)).groupPrices).toEqual([
      { groupId: 2, price: '16.2500' },
      { groupId: 3, price: '15.9000' },
      { groupId: RETAIL, price: '20.4900' },
    ]);
  });

  it('still sends the loaded figure when staff type a new retail price, and the server writes the typed one', async () => {
    await withRetailGroup('19.9900');
    const user = userEvent.setup();
    const dialog = await openGroupPrices(user);
    const box = await dialog.findByRole('textbox', { name: 'Storefront retail' });
    await user.clear(box);
    await user.type(box, '21');
    const requests = recordRequests();
    await user.click(dialog.getByRole('button', { name: 'Save group prices' }));
    expect(await screen.findByText('Group prices saved')).toBeInTheDocument();
    expect(savedBody(requests)).toMatchObject({
      prices: expect.arrayContaining([{ groupId: RETAIL, price: '21.0000' }]),
      retailPriceSeen: '19.9900',
    });
    expect((await getService(5)).groupPrices).toContainEqual({ groupId: RETAIL, price: '21.0000' });
  });

  it('sends null when the service had no retail price, and the server keeps one that was set since', async () => {
    await withRetailGroup(null);
    const user = userEvent.setup();
    const dialog = await openGroupPrices(user);
    expect(await dialog.findByRole('textbox', { name: 'Storefront retail' })).toHaveValue('');
    await moveRetailTo('18.0000');
    const requests = recordRequests();
    await user.click(dialog.getByRole('button', { name: 'Save group prices' }));
    expect(await screen.findByText('Group prices saved')).toBeInTheDocument();
    expect(savedBody(requests)).toEqual({
      prices: [{ groupId: 3, price: '15.9000' }],
      retailPriceSeen: null,
    });
    expect((await getService(5)).groupPrices).toContainEqual({ groupId: RETAIL, price: '18.0000' });
  });

  it('sends the key even when the menu lists no retail group', async () => {
    const user = userEvent.setup();
    const dialog = await openGroupPrices(user);
    expect(await dialog.findByRole('textbox', { name: 'VIP' })).toHaveValue('15.90');
    const requests = recordRequests();
    await user.click(dialog.getByRole('button', { name: 'Save group prices' }));
    expect(await screen.findByText('Group prices saved')).toBeInTheDocument();
    expect(savedBody(requests)).toEqual({
      prices: [{ groupId: 3, price: '15.9000' }],
      retailPriceSeen: null,
    });
  });
});
