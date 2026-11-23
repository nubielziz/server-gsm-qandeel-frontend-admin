// Tests for what the staff member's permissions open and disable on the Catalog page: which view opens first (the table only with
// catalog:read, else the settings on their first tab, else the publish runs), which settings tabs show, which buttons and switches
// are disabled (with the missing permission in their title), and the page gate. Every check is a hint for the user; the server still
// refuses what the role may not do.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockMe, renderApp, setupMockApi, signInAs } from '@/test/renderApp';
import { recordRequests } from '../test/requests';
import {
  CATALOG_ROUTE,
  catalogRoute,
  openServices,
  serviceRow,
  servicesTable,
  settingsRoute,
  tabTexts,
} from '../test/servicesPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

/** Whether the page read the services list (the table or its counts). */
const readServices = (requests: ReturnType<typeof recordRequests>) =>
  requests.sent().some((sent) => sent.method === 'GET' && sent.url.pathname.endsWith('/admin/services'));

describe('a reader of the catalog', () => {
  const READER = ['catalog:read'];

  it('opens on the table, and its settings show the Categories tab only', async () => {
    const user = userEvent.setup();
    await openServices(CATALOG_ROUTE, { permissions: READER });
    expect(
      await screen.findByText('1 service is priced below cost plus minimum profit.'),
    ).toBeInTheDocument();
    await servicesTable();
    await user.click(screen.getByRole('link', { name: 'Catalog settings' }));
    await waitFor(() => expect(tabTexts()).toEqual(['Categories']));
  });

  it('cannot change anything: the buttons and switches say which permission they need', async () => {
    await openServices(CATALOG_ROUTE, { permissions: READER });
    const add = screen.getByRole('button', { name: 'Add services' });
    expect(add).toBeDisabled();
    expect(add).toHaveAttribute('title', 'You need the catalog:create permission');
    expect(screen.getByRole('button', { name: 'Bulk price change…' })).toHaveAttribute(
      'title',
      'You need the pricing:update permission',
    );
    const row = await serviceRow('EE UK Unlock');
    const enabled = row.getByRole('switch', { name: 'Enable EE UK Unlock' });
    expect(enabled).toBeDisabled();
    expect(enabled).toHaveAttribute('title', 'You need the catalog:update permission');
    // The price is plain text, not an edit button.
    expect(row.queryByRole('button', { name: /^Edit price of/ })).not.toBeInTheDocument();
  });

  it('has a row menu whose actions are disabled, except the links the role may follow', async () => {
    const user = userEvent.setup();
    await openServices(CATALOG_ROUTE, { permissions: READER });
    await user.click(await screen.findByRole('button', { name: 'Actions for EE UK Unlock' }));
    const menu = within(await screen.findByRole('menu'));
    // "Edit price…" names the permissions it lacks after its label (the price needs two), so it is found by the start of its name.
    expect(menu.getByRole('menuitem', { name: /^Edit price…/ })).toBeDisabled();
    for (const name of ['Edit service…', 'Group prices…', 'Fields…', 'Options…', 'Delete…']) {
      expect(menu.getByRole('menuitem', { name })).toBeDisabled();
    }
    expect(menu.getByRole('menuitem', { name: 'Trace a merchant price' })).toBeDisabled();
    expect(menu.getByRole('menuitem', { name: 'See orders' })).toBeDisabled();
  });

  it('falls back to the first settings tab it may open when the address names one it may not', async () => {
    await openServices(settingsRoute('inventory'), { permissions: READER });
    expect(await screen.findByRole('tab', { name: 'Categories' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('table', { name: 'Service categories' })).toBeInTheDocument();
  });

  it('cannot open the publish runs: the menu item says why, and their address opens the table', async () => {
    const user = userEvent.setup();
    const app = await openServices(catalogRoute('view=publish&run=1'), { permissions: READER });
    await waitFor(() => expect(app.location()).toBe(CATALOG_ROUTE));
    await servicesTable();
    expect(screen.queryByRole('region', { name: 'Publish runs' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'More catalog actions' }));
    const item = await screen.findByRole('menuitem', { name: /^Publish runs/ });
    expect(item).toBeDisabled();
    expect(item).toHaveAttribute('title', 'You need the storefront:read permission');
  });

  it('sees the resolver and both kinds of price rules with pricing:read too', async () => {
    await openServices(settingsRoute(), { permissions: ['catalog:read', 'pricing:read'] });
    await waitFor(() =>
      expect(tabTexts()).toEqual([
        'Categories',
        'Merchant price rules',
        'Shop price rules3',
        'Price resolver',
      ]),
    );
  });
});

describe('an editor of the catalog', () => {
  const NEEDS_PRICING = 'You need the pricing:update permission';

  it('can use the switches, but sees the price as plain text: saving a price also needs pricing:update', async () => {
    await openServices(CATALOG_ROUTE, { permissions: ['catalog:read', 'catalog:update'] });
    const row = await serviceRow('EE UK Unlock');
    expect(row.getByRole('switch', { name: 'Enable EE UK Unlock' })).toBeEnabled();
    expect(row.queryByRole('button', { name: /^Edit price of/ })).not.toBeInTheDocument();
    expect(row.getByTitle(NEEDS_PRICING)).toBeInTheDocument();
  });

  it('has the row menu item "Edit price…" locked, naming pricing:update, while the other edits are open', async () => {
    const user = userEvent.setup();
    await openServices(CATALOG_ROUTE, { permissions: ['catalog:read', 'catalog:update'] });
    await user.click(await screen.findByRole('button', { name: 'Actions for EE UK Unlock' }));
    const menu = within(await screen.findByRole('menu'));
    const price = menu.getByRole('menuitem', { name: /^Edit price…/ });
    expect(price).toBeDisabled();
    expect(price).toHaveAttribute('title', NEEDS_PRICING);
    expect(menu.getByRole('menuitem', { name: 'Edit service…' })).toBeEnabled();
  });

  it('can edit prices once it also holds pricing:update, from the table and from the row menu', async () => {
    const user = userEvent.setup();
    await openServices(CATALOG_ROUTE, {
      permissions: ['catalog:read', 'catalog:update', 'pricing:update'],
    });
    const row = await serviceRow('EE UK Unlock');
    expect(row.getByRole('button', { name: /^Edit price of EE UK Unlock/ })).toBeEnabled();
    await user.click(await screen.findByRole('button', { name: 'Actions for EE UK Unlock' }));
    expect(
      within(await screen.findByRole('menu')).getByRole('menuitem', { name: 'Edit price…' }),
    ).toBeEnabled();
  });
});

describe('a role without catalog:read', () => {
  it('opens on the code inventory for inventory:read alone, and never reads the table', async () => {
    const requests = recordRequests();
    const app = await openServices(CATALOG_ROUTE, { permissions: ['inventory:read'] });
    await waitFor(() => expect(app.location()).toBe(settingsRoute()));
    expect(await screen.findByRole('tab', { name: 'Code inventory' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(tabTexts()).toEqual(['Code inventory']);
    expect(await screen.findByText('30 codes')).toBeInTheDocument();
    // No table, no header sentence or table actions, and no way back to a table the role may not read.
    expect(screen.queryByRole('table', { name: 'Services' })).not.toBeInTheDocument();
    expect(screen.queryByText(/priced below cost/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Every active service is priced above its floor\./)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add services' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Back to the table' })).not.toBeInTheDocument();
    expect(readServices(requests)).toBe(false);
  });

  it('opens on the merchant price rules for pricing:read alone, also from an old table address', async () => {
    const requests = recordRequests();
    const app = await openServices(catalogRoute('belowFloor=true'), { permissions: ['pricing:read'] });
    await waitFor(() => expect(app.location()).toBe(settingsRoute()));
    expect(await screen.findByRole('tab', { name: 'Merchant price rules' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await waitFor(() => expect(tabTexts()).toEqual(['Merchant price rules', 'Shop price rules3']));
    expect(await screen.findByRole('table', { name: 'Pricing rules' })).toBeInTheDocument();
    // Neither the table nor the publish runs are this role's, so the header links to neither.
    expect(screen.queryByRole('link', { name: 'Publish runs' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Back to the table' })).not.toBeInTheDocument();
    expect(readServices(requests)).toBe(false);
  });

  it('moves between the settings and the publish runs for pricing:read and storefront:read, with no table', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const app = await openServices(CATALOG_ROUTE, { permissions: ['pricing:read', 'storefront:read'] });
    await waitFor(() => expect(app.location()).toBe(settingsRoute()));
    await user.click(await screen.findByRole('link', { name: 'Publish runs' }));
    await waitFor(() => expect(app.location()).toBe(catalogRoute('view=publish')));
    expect(await screen.findByRole('link', { name: 'Catalog settings' })).toHaveAttribute(
      'href',
      settingsRoute(),
    );
    expect(screen.queryByRole('link', { name: 'Back to the table' })).not.toBeInTheDocument();
    expect(readServices(requests)).toBe(false);
  });

  it('opens the merchant price rules for pricing:read alone, since the resolver also needs the catalog', async () => {
    const app = await openServices(settingsRoute('resolver'), { permissions: ['pricing:read'] });
    expect(await screen.findByRole('tab', { name: 'Merchant price rules' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    // A tab the role may not open falls back where it stands; the address keeps the settings view.
    expect(app.location()).toBe(settingsRoute('resolver'));
  });

  it('opens the publish runs for storefront:read alone, where preparing a run needs storefront:create', async () => {
    const requests = recordRequests();
    const app = await openServices(CATALOG_ROUTE, { permissions: ['storefront:read'] });
    await waitFor(() => expect(app.location()).toBe(catalogRoute('view=publish')));
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Publish services to the shop' }),
    ).toBeInTheDocument();
    const prepare = screen.getByRole('button', { name: 'Prepare the preview' });
    expect(prepare).toBeDisabled();
    expect(prepare).toHaveAttribute('title', 'You need the storefront:create permission');
    expect(await screen.findByRole('table', { name: 'Publish runs' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Back to the table' })).not.toBeInTheDocument();
    expect(readServices(requests)).toBe(false);
  });

  it('sends storefront:read alone from a settings address to the publish runs', async () => {
    const app = await openServices(settingsRoute('shop-prices'), { permissions: ['storefront:read'] });
    await waitFor(() => expect(app.location()).toBe(catalogRoute('view=publish')));
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Publish services to the shop' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('tablist', { name: 'Catalog settings sections' })).not.toBeInTheDocument();
  });
});

describe('the page gate', () => {
  it('shows the no-access page to a role with none of the four read permissions', async () => {
    await signInAs();
    mockMe({ id: 1, name: 'Rami K.', permissions: ['orders:read'] });
    renderApp(CATALOG_ROUTE);
    expect(
      await screen.findByText('You do not have access to this page', {}, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('catalog:read or pricing:read or inventory:read or storefront:read'),
    ).toBeInTheDocument();
  });
});
