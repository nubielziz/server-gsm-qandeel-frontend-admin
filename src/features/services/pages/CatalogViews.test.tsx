// Tests for the three views of the Catalog page, run through the whole app against the dev mock API: the services table at the bare
// address with the links to the other two views, the Catalog settings with their tab strip and the address each tab writes, the
// publish runs with the run in the address, and the way back to the table. Only one view is on screen at a time.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import {
  CATALOG_ROUTE,
  catalogRoute,
  openServices,
  openTab,
  servicesTable,
  settingsRoute,
  tabTexts,
} from '../test/servicesPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

const SETTINGS_STRIP = { name: 'Catalog settings sections' };

describe('the table view', () => {
  it('is the bare address: the services table and the header actions, and no other view', async () => {
    await openServices();
    await servicesTable();
    expect(screen.getByRole('link', { name: 'Catalog settings' })).toHaveAttribute('href', settingsRoute());
    expect(screen.getByRole('button', { name: 'Add services' })).toBeEnabled();
    // The old "New service" button is gone: "A service of my own" in the Add services flow replaces it.
    expect(screen.queryByRole('button', { name: 'New service' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bulk price change…' })).toBeEnabled();
    expect(screen.queryByRole('tablist', SETTINGS_STRIP)).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Publish runs' })).not.toBeInTheDocument();
  });

  it('lists the services under their floor from the header sentence', async () => {
    const user = userEvent.setup();
    const app = await openServices(catalogRoute('q=unlock'));
    await user.click(
      await screen.findByRole('link', { name: '1 service is priced below cost plus minimum profit.' }),
    );
    await waitFor(() => expect(app.location()).toBe(catalogRoute('belowFloor=true')));
    await servicesTable();
  });
});

describe('the settings view', () => {
  it('opens from the header on the first tab, instead of the table, and writes each tab into the address', async () => {
    const user = userEvent.setup();
    const app = await openServices(catalogRoute('q=unlock'));
    await servicesTable();
    await user.click(screen.getByRole('link', { name: 'Catalog settings' }));
    await waitFor(() => expect(app.location()).toBe(settingsRoute()));
    expect(screen.getByRole('heading', { level: 1, name: 'Catalog' })).toBeInTheDocument();
    expect(screen.getByText('Catalog settings')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Services' })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(tabTexts()).toEqual([
        'Categories',
        'Merchant price rules',
        'Shop price rules3',
        'Price resolver',
        'Code inventory',
      ]),
    );
    expect(screen.getByRole('tab', { name: 'Categories' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('table', { name: 'Service categories' })).toBeInTheDocument();

    const rules = await openTab(user, 'Merchant price rules');
    expect(app.location()).toBe(settingsRoute('rules'));
    expect(await rules.findByRole('table', { name: 'Pricing rules' })).toBeInTheDocument();

    await openTab(user, 'Code inventory');
    expect(app.location()).toBe(settingsRoute('inventory'));
    expect(await screen.findByText('30 codes')).toBeInTheDocument();
  });

  it('holds the shop price rules, with the proposals that wait counted on their tab', async () => {
    const user = userEvent.setup();
    const app = await openServices(settingsRoute());
    const panel = await openTab(user, 'Shop price rules');
    expect(app.location()).toBe(settingsRoute('shop-prices'));
    expect(await panel.findByRole('heading', { level: 2, name: 'Retail pricing rules' })).toBeInTheDocument();
    expect(panel.getByRole('heading', { level: 2, name: 'Price changes' })).toBeInTheDocument();
    await waitFor(() => expect(tabTexts()[2]).toBe('Shop price rules3'));
  });

  it('links to the publish runs, which open instead of the settings', async () => {
    const user = userEvent.setup();
    const app = await openServices(settingsRoute('rules'));
    await user.click(await screen.findByRole('link', { name: 'Publish runs' }));
    await waitFor(() => expect(app.location()).toBe(catalogRoute('view=publish')));
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Publish services to the shop' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('tablist', SETTINGS_STRIP)).not.toBeInTheDocument();
  });

  it('goes back to the table, which reads its own address again', async () => {
    const user = userEvent.setup();
    const app = await openServices(settingsRoute('inventory'));
    expect(await screen.findByText('30 codes')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Back to the table' }));
    await waitFor(() => expect(app.location()).toBe(CATALOG_ROUTE));
    await servicesTable();
    expect(screen.queryByRole('tablist', SETTINGS_STRIP)).not.toBeInTheDocument();
  });
});

describe('the publish view', () => {
  it('opens from the header menu on its start and the earlier runs, instead of the table', async () => {
    const user = userEvent.setup();
    const app = await openServices(catalogRoute('q=unlock'));
    await servicesTable();
    await user.click(screen.getByRole('button', { name: 'More catalog actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Publish runs' }));
    await waitFor(() => expect(app.location()).toBe(catalogRoute('view=publish')));
    const view = within(screen.getByRole('region', { name: 'Publish runs' }));
    expect(
      await view.findByRole('heading', { level: 2, name: 'Publish services to the shop' }),
    ).toBeInTheDocument();
    expect(await view.findByRole('table', { name: 'Publish runs' })).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Services' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the table' })).toHaveAttribute('href', CATALOG_ROUTE);
  });

  it('writes the run it prepares into the address, and Cancel goes back to the start', async () => {
    const user = userEvent.setup();
    const app = await openServices(catalogRoute('view=publish'));
    await user.click(await screen.findByRole('button', { name: 'Prepare the preview' }));
    await waitFor(() => expect(app.location()).toBe(catalogRoute('view=publish&run=8')));
    expect(await screen.findByRole('heading', { level: 2, name: 'Publish run 8' })).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(app.location()).toBe(catalogRoute('view=publish')));
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Publish services to the shop' }),
    ).toBeInTheDocument();
  });

  it('links to the Catalog settings', async () => {
    await openServices(catalogRoute('view=publish'));
    expect(await screen.findByRole('link', { name: 'Catalog settings' })).toHaveAttribute(
      'href',
      settingsRoute(),
    );
  });

  it('opens the run the address names', async () => {
    await openServices(catalogRoute('view=publish&run=1'));
    expect(await screen.findByRole('heading', { level: 2, name: 'Publish run 1' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Publish services to the shop' }),
    ).not.toBeInTheDocument();
  });
});
