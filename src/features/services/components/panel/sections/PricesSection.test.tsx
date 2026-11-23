// Tests for the panel's Prices section: the two forms that save on their own (the merchant price, the group prices), the shop slot
// between them, the retail group's box that the panel leaves out while its saved row still goes back, the dirty report and the
// permission of each control. The section runs against the dev mock API, as the dialogs' tests do.
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SidePanelSection } from '@/components/ui';
import { ShopPriceBlock } from '@/features/storefront';
import { mockServer } from '@/mocks/node';
import { mockMe, setupMockApi, signInAs } from '@/test/renderApp';
import { getService, listServices } from '../../../api';
import { useServiceGrants } from '../../../hooks/useServiceGrants';
import { servicesStore } from '../../../mocks/store';
import { groupHandlers } from '../../../mocks/testGroups';
import { AppWrapper } from '../../../test/AppWrapper';
import { recordRequests } from '../../../test/requests';
import type { Service } from '../../../types';
import { PricesSection } from './PricesSection';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
// The merchants feature serves the group list; these tests bring their own copy of it.
beforeEach(() => mockServer.use(...groupHandlers));
afterEach(() => vi.restoreAllMocks());

type User = ReturnType<typeof userEvent.setup>;

const AT_T = 5;
const RETAIL = 9;

/** Reads the grants the way the panel's host does, then mounts the section for one service in the panel's frame. */
function Harness({
  service,
  shopSlot,
  onDirtyChange,
}: {
  service: Service;
  shopSlot?: ReactNode;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const grants = useServiceGrants();
  if (!grants.ready) return null;
  return (
    <SidePanelSection id="service-panel-prices" title="Prices">
      <PricesSection
        service={service}
        grants={grants}
        active={false}
        onDirtyChange={onDirtyChange}
        shopSlot={shopSlot}
      />
    </SidePanelSection>
  );
}

type Options = {
  /** The name of the service to open; the default is service 5. */
  name?: string;
  permissions?: string[];
  shopSlot?: ReactNode;
  onDirtyChange?: (dirty: boolean) => void;
};

/** Signs in (with fewer permissions when asked) and mounts the section; returns its region. */
async function openPrices({ name, permissions, shopSlot, onDirtyChange = () => {} }: Options = {}) {
  await signInAs();
  if (permissions) mockMe({ id: 1, name: 'Rami K.', permissions });
  const row = name ? await serviceNamed(name) : await getService(AT_T);
  render(
    <AppWrapper>
      <Harness service={row} shopSlot={shopSlot} onDirtyChange={onDirtyChange} />
    </AppWrapper>,
  );
  return within(await screen.findByRole('region', { name: 'Prices' }));
}

/** A service of the mock catalog by its name (the staff member is signed in). */
async function serviceNamed(name: string) {
  const found = (await listServices({ q: name })).data.find((service) => service.name === name);
  if (!found) throw new Error(`No service named ${name}.`);
  return found;
}

/** Clears a box and types into it. */
async function retype(user: User, box: HTMLElement, text: string) {
  await user.clear(box);
  await user.type(box, text);
}

/** Adds the storefront's retail group to the mock groups and sets what service 5 has saved for it. */
async function withRetailGroup(price: string) {
  const stores = await servicesStore();
  stores.groups.push({ id: RETAIL, name: 'Storefront retail', kind: 'b2c_retail', discountPercent: 0 });
  stores.services.find(String(AT_T))?.groupPrices.push({ groupId: RETAIL, price });
}

/** Moves the stored retail price the way a follow pass does, behind the open form's back. */
async function moveRetailTo(price: string) {
  const service = (await servicesStore()).services.find(String(AT_T));
  if (!service) throw new Error('No service 5.');
  service.groupPrices = [
    ...service.groupPrices.filter((row) => row.groupId !== RETAIL),
    { groupId: RETAIL, price },
  ];
}

/** The bodies of the group prices saves that were sent, oldest first. */
function groupSaves(requests: ReturnType<typeof recordRequests>) {
  return requests
    .sent()
    .filter((one) => one.method === 'PUT' && one.url.pathname.endsWith('/group-prices'))
    .map((one) => one.body);
}

describe('the merchant price form', () => {
  it('shows the cost, the floor and the margin the server worked out, and a Save that waits for a change', async () => {
    const section = await openPrices();
    expect(section.getByText('Supplier cost')).toBeInTheDocument();
    expect(section.getByText('$13.50')).toBeInTheDocument();
    expect(section.getByText('$14.31')).toBeInTheDocument();
    expect(section.getByText('21.9%')).toBeInTheDocument();
    expect(section.getByRole('textbox', { name: 'Base price (USD)' })).toHaveValue('17.28');
    expect(section.getByRole('textbox', { name: 'Minimum profit (USD)' })).toHaveValue('0.81');
    expect(section.getByRole('button', { name: 'Save merchant price' })).toBeDisabled();
    expect(section.queryByText(/Under the floor/)).not.toBeInTheDocument();
  });

  it('says so, in the server’s words, when the price is under the floor, and what the supplier changed the cost from', async () => {
    const section = await openPrices({ name: 'Chimera Tool 1 Month' });
    expect(section.getByText('Under the floor: orders are charged the floor price.')).toBeInTheDocument();
    expect(section.getByText('(was $17.00)')).toBeInTheDocument();
    expect(section.getByText('$20.99')).toBeInTheDocument();
  });

  it('sends only what changed, stays open, shows the saved figures and resets the boxes', async () => {
    const user = userEvent.setup();
    const section = await openPrices();
    const requests = recordRequests();
    await retype(user, section.getByRole('textbox', { name: 'Base price (USD)' }), '15');
    await user.click(section.getByRole('button', { name: 'Save merchant price' }));
    expect(await screen.findByText('Price updated')).toBeInTheDocument();
    const patches = requests.sent().filter((one) => one.method === 'PATCH');
    expect(patches).toHaveLength(1);
    expect(patches[0]?.body).toEqual({ basePrice: '15.0000' });
    expect((await getService(AT_T)).basePrice).toBe('15.0000');
    expect(await section.findByText('Merchant price saved')).toBeInTheDocument();
    // The margin is the one the server sent with the answer; the boxes show the saved text and the button waits again.
    expect(section.getByText('10%')).toBeInTheDocument();
    expect(section.getByRole('textbox', { name: 'Base price (USD)' })).toHaveValue('15.00');
    expect(section.getByRole('button', { name: 'Save merchant price' })).toBeDisabled();
  });

  it('shows the server’s refusal of a price under the floor under the box and keeps what was typed', async () => {
    const user = userEvent.setup();
    const section = await openPrices();
    await retype(user, section.getByRole('textbox', { name: 'Base price (USD)' }), '14');
    await user.click(section.getByRole('button', { name: 'Save merchant price' }));
    expect(
      await section.findByText('Below the floor. Cost $13.50 plus minimum profit $0.81 is $14.31.'),
    ).toBeInTheDocument();
    const box = section.getByRole('textbox', { name: 'Base price (USD)' });
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveValue('14');
    await waitFor(() => expect(section.getByRole('button', { name: 'Save merchant price' })).toBeEnabled());
    expect((await getService(AT_T)).basePrice).toBe('17.2800');
  });

  it('asks for a price above zero before it calls the server', async () => {
    const user = userEvent.setup();
    const section = await openPrices();
    const requests = recordRequests();
    await retype(user, section.getByRole('textbox', { name: 'Base price (USD)' }), 'abc');
    await user.click(section.getByRole('button', { name: 'Save merchant price' }));
    expect(await section.findByText('Enter a price greater than zero.')).toBeInTheDocument();
    expect(requests.sent().some((one) => one.method === 'PATCH')).toBe(false);
  });
});

describe('the dirty report', () => {
  it('says the section is dirty while a box holds a change, and clean after the save', async () => {
    const user = userEvent.setup();
    const onDirtyChange = vi.fn();
    const section = await openPrices({ onDirtyChange });
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));
    await retype(user, section.getByRole('textbox', { name: 'Base price (USD)' }), '15');
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));
    await user.click(section.getByRole('button', { name: 'Save merchant price' }));
    expect(await section.findByText('Merchant price saved')).toBeInTheDocument();
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));
  });

  it('counts a change in the group prices too, and goes back to clean when the change is undone', async () => {
    const user = userEvent.setup();
    const onDirtyChange = vi.fn();
    const section = await openPrices({ onDirtyChange });
    const box = await section.findByRole('textbox', { name: 'Wholesale' });
    await user.type(box, '16.25');
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));
    await user.clear(box);
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));
  });
});

describe('the group prices form', () => {
  it('starts from the saved prices, one box per merchant group, and saves the new list', async () => {
    const user = userEvent.setup();
    const section = await openPrices();
    expect(await section.findByRole('textbox', { name: 'VIP' })).toHaveValue('15.90');
    expect(section.getByRole('textbox', { name: 'Standard' })).toHaveValue('');
    expect(section.getByText('Pays the base price less 4%.')).toBeInTheDocument();
    expect(section.getByRole('button', { name: 'Save group prices' })).toBeDisabled();
    await user.type(section.getByRole('textbox', { name: 'Wholesale' }), '16.25');
    await user.click(section.getByRole('button', { name: 'Save group prices' }));
    expect(await screen.findByText('Group prices saved')).toBeInTheDocument();
    expect((await getService(AT_T)).groupPrices).toEqual([
      { groupId: 2, price: '16.2500' },
      { groupId: 3, price: '15.9000' },
    ]);
    expect(await section.findByText('Saved')).toBeInTheDocument();
    expect(section.getByRole('textbox', { name: 'Wholesale' })).toHaveValue('16.25');
    expect(section.getByRole('button', { name: 'Save group prices' })).toBeDisabled();
  });

  it('asks for a price above zero under the box and sends nothing', async () => {
    const user = userEvent.setup();
    const section = await openPrices();
    const requests = recordRequests();
    await user.type(await section.findByRole('textbox', { name: 'Standard' }), '0');
    await user.click(section.getByRole('button', { name: 'Save group prices' }));
    expect(await section.findByText('Enter a price greater than zero.')).toBeInTheDocument();
    expect(groupSaves(requests)).toHaveLength(0);
  });

  it('has no box for the retail group, and sends its saved row back with the figure it loaded', async () => {
    await withRetailGroup('19.9900');
    const user = userEvent.setup();
    const section = await openPrices();
    expect(await section.findByRole('textbox', { name: 'VIP' })).toHaveValue('15.90');
    expect(section.queryByRole('textbox', { name: 'Storefront retail' })).not.toBeInTheDocument();
    await moveRetailTo('20.4900');
    const requests = recordRequests();
    await user.type(section.getByRole('textbox', { name: 'Wholesale' }), '16.25');
    await user.click(section.getByRole('button', { name: 'Save group prices' }));
    expect(await screen.findByText('Group prices saved')).toBeInTheDocument();
    expect(groupSaves(requests)).toEqual([
      {
        prices: [
          { groupId: 2, price: '16.2500' },
          { groupId: 3, price: '15.9000' },
          { groupId: RETAIL, price: '19.9900' },
        ],
        retailPriceSeen: '19.9900',
      },
    ]);
    // The server kept the retail price that moved after the form opened.
    expect((await getService(AT_T)).groupPrices).toContainEqual({ groupId: RETAIL, price: '20.4900' });
  });

  it('takes the server’s answer as what it loaded, so a second save still leaves the retail price alone', async () => {
    await withRetailGroup('19.9900');
    const user = userEvent.setup();
    const section = await openPrices();
    await moveRetailTo('20.4900');
    await user.type(await section.findByRole('textbox', { name: 'Wholesale' }), '16.25');
    await user.click(section.getByRole('button', { name: 'Save group prices' }));
    expect(await section.findByText('Saved')).toBeInTheDocument();

    const requests = recordRequests();
    await user.type(section.getByRole('textbox', { name: 'Standard' }), '10');
    await user.click(section.getByRole('button', { name: 'Save group prices' }));
    await waitFor(() => expect(groupSaves(requests)).toHaveLength(1));
    expect(groupSaves(requests)[0]).toEqual({
      prices: [
        { groupId: 1, price: '10.0000' },
        { groupId: 2, price: '16.2500' },
        { groupId: 3, price: '15.9000' },
        { groupId: RETAIL, price: '20.4900' },
      ],
      retailPriceSeen: '20.4900',
    });
    await waitFor(async () =>
      expect((await getService(AT_T)).groupPrices).toContainEqual({ groupId: RETAIL, price: '20.4900' }),
    );
  });

  it('sends the key even when the service has no retail price', async () => {
    const user = userEvent.setup();
    const section = await openPrices();
    const requests = recordRequests();
    await user.type(await section.findByRole('textbox', { name: 'Wholesale' }), '16.25');
    await user.click(section.getByRole('button', { name: 'Save group prices' }));
    await waitFor(() => expect(groupSaves(requests)).toHaveLength(1));
    expect(groupSaves(requests)[0]).toMatchObject({ retailPriceSeen: null });
  });
});

describe('the shop slot', () => {
  it('draws what it is given under the heading Shop price, between the two forms', async () => {
    const section = await openPrices({ shopSlot: <p>Shop price block</p> });
    const merchant = section.getByRole('group', { name: 'Merchant price' });
    const shop = section.getByRole('group', { name: 'Shop price' });
    const groups = section.getByRole('group', { name: 'Group prices' });
    expect(shop).toHaveTextContent('Shop price block');
    expect(merchant.compareDocumentPosition(shop) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(shop.compareDocumentPosition(groups) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(await section.findByText('The shop price has its own block above.')).toBeInTheDocument();
  });

  it('gives the shop price block a fresh copy of its listing after a merchant price save', async () => {
    const user = userEvent.setup();
    const section = await openPrices({
      shopSlot: (
        <ShopPriceBlock
          serviceId={AT_T}
          listingId={AT_T}
          retailPrice="25.9900"
          retailPriceSource="manual"
          onDirtyChange={() => {}}
        />
      ),
    });
    await section.findByRole('textbox', { name: /^Price shown to customers/ });
    const requests = recordRequests();
    await retype(user, section.getByRole('textbox', { name: 'Base price (USD)' }), '15');
    await user.click(section.getByRole('button', { name: 'Save merchant price' }));
    expect(await screen.findByText('Price updated')).toBeInTheDocument();
    // The listing prints the base price and the shop floor, and it is kept for good: only this write makes the open copy old.
    await waitFor(() =>
      expect(
        requests
          .sent()
          .filter((one) => one.method === 'GET' && one.url.pathname.endsWith('/admin/service-listings/5')),
      ).not.toHaveLength(0),
    );
  });

  it('draws nothing, not even the heading, when no slot is given', async () => {
    const section = await openPrices();
    await section.findByRole('textbox', { name: 'VIP' });
    expect(section.queryByRole('group', { name: 'Shop price' })).not.toBeInTheDocument();
    expect(section.queryByText('The shop price has its own block above.')).not.toBeInTheDocument();
  });
});

describe('the permissions of each control', () => {
  const NEEDS_PRICING = 'You need the pricing:update permission';

  it('keeps a role that may change the service but not its prices from saving either form, and names what it lacks', async () => {
    const section = await openPrices({ permissions: ['catalog:read', 'catalog:update', 'groups:read'] });
    const price = section.getByRole('textbox', { name: 'Base price (USD)' });
    expect(price).toBeDisabled();
    expect(price).toHaveAttribute('title', NEEDS_PRICING);
    const save = section.getByRole('button', { name: 'Save merchant price' });
    expect(save).toBeDisabled();
    expect(save.parentElement).toHaveAttribute('title', NEEDS_PRICING);
    const groupBox = await section.findByRole('textbox', { name: 'VIP' });
    expect(groupBox).toBeDisabled();
    expect(groupBox).toHaveAttribute('title', NEEDS_PRICING);
    expect(section.getByRole('button', { name: 'Save group prices' }).parentElement).toHaveAttribute(
      'title',
      NEEDS_PRICING,
    );
  });

  it('names both permissions when the role holds neither of the two the price needs', async () => {
    const section = await openPrices({ permissions: ['catalog:read'] });
    expect(section.getByRole('textbox', { name: 'Base price (USD)' })).toHaveAttribute(
      'title',
      'You need the catalog:update and pricing:update permission',
    );
  });

  it('lets a role that holds only part of the section use that part', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const section = await openPrices({ permissions: ['catalog:read', 'catalog:update', 'pricing:update'] });
    // Without groups:read the groups cannot be listed: a sentence takes the place of the form and nothing is asked for.
    expect(
      await section.findByText('You need the groups:read permission to see the merchant groups.'),
    ).toBeInTheDocument();
    expect(section.queryByRole('button', { name: 'Save group prices' })).not.toBeInTheDocument();
    expect(requests.sent().some((one) => one.url.pathname.endsWith('/admin/client-groups'))).toBe(false);
    // The merchant price form still saves.
    await retype(user, section.getByRole('textbox', { name: 'Minimum profit (USD)' }), '1');
    await user.click(section.getByRole('button', { name: 'Save merchant price' }));
    expect(await section.findByText('Merchant price saved')).toBeInTheDocument();
    expect((await getService(AT_T)).minProfit).toBe('1.0000');
  });
});
