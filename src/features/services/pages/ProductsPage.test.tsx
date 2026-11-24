// Tests for the Product / Services page, run through the whole app against the dev mock API: the title, the strip of kinds and the row of
// views (which a role sees, where an unknown or forbidden address lands) and the three extra views inside the frame (the price rules with
// their three text links, the publish start, the code stock). Each view of the first row and the edit view have their own tests, in
// components/products/<view>/.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { groupHandlers } from '../mocks/testGroups';
import {
  currentLink,
  kindStrip,
  linkTexts,
  openProducts,
  servicesTable,
  viewLinks,
} from '../test/productsPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
// The accounts feature serves the rank list; these tests bring their own copy of it.
beforeEach(() => mockServer.use(...groupHandlers));
afterEach(() => vi.restoreAllMocks());

const ALL_VIEWS = [
  'All',
  'Pricing',
  '+Add Service',
  'Group',
  '+Add Group',
  'Price Rules',
  'Shop Publish',
  'Inventory',
];

describe('the frame', () => {
  it('draws the title, the strip of kinds and the row of views for the Owner', async () => {
    await openProducts();
    const kinds = await kindStrip();
    expect(linkTexts(kinds)).toEqual(['IMEI Service', 'Server Service', 'Remote Service', 'File Service']);
    expect(currentLink(kinds)).toBe('IMEI Service');
    const views = await viewLinks();
    expect(linkTexts(views)).toEqual(ALL_VIEWS);
    expect(currentLink(views)).toBe('All');
  });

  it('opens the first view: the Quick Search box and the list of the services of the kind', async () => {
    await openProducts();
    expect(await servicesTable()).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Quick Search' })).toBeInTheDocument();
  });

  it('links the strip to the same view of each kind, and the row to the views of the kind on the strip', async () => {
    await openProducts('/products?view=groups&type=server');
    const kinds = await kindStrip();
    expect(currentLink(kinds)).toBe('Server Service');
    expect(kinds.getByRole('link', { name: 'Remote Service' })).toHaveAttribute(
      'href',
      '/products?view=groups&type=remote',
    );
    const views = await viewLinks();
    expect(currentLink(views)).toBe('Group');
    expect(views.getByRole('link', { name: 'Pricing' })).toHaveAttribute(
      'href',
      '/products?view=pricing&type=server',
    );
    expect(views.getByRole('link', { name: 'Add Service' })).toHaveAttribute(
      'href',
      '/products?view=add&type=server',
    );
    expect(views.getByRole('link', { name: 'Shop Publish' })).toHaveAttribute(
      'href',
      '/products?view=publish&type=server',
    );
  });

  it('goes to another kind from the strip and stays on the same view', async () => {
    const user = userEvent.setup();
    const app = await openProducts('/products?view=groups');
    await user.click((await kindStrip()).getByRole('link', { name: 'Server Service' }));
    await waitFor(() => expect(app.location()).toBe('/products?view=groups&type=server'));
    await waitFor(async () => expect(currentLink(await kindStrip())).toBe('Server Service'));
    expect(currentLink(await viewLinks())).toBe('Group');
  });
});

describe('the frame fills the window', () => {
  it.each([
    ['/products?view=add-group', 'Add Group'],
    ['/products?view=all', 'All'],
  ])(
    'holds the heading, the rows of links and %s in one page frame, the view taking what is left',
    async (route, name) => {
      await openProducts(route);
      const view = await screen.findByRole('region', { name });
      const frame = view.parentElement;
      expect(frame).toHaveClass('page-frame');
      // The heading and the two rows of links come first and keep their height; the view is the last child and grows (flex-1).
      expect(frame?.firstElementChild).toContainElement(
        screen.getByRole('heading', { level: 1, name: 'Product / Services' }),
      );
      const kinds = await kindStrip();
      expect(frame).toContainElement(kinds.getByRole('link', { name: 'IMEI Service' }));
      expect(frame?.lastElementChild).toBe(view);
      expect(view).toHaveClass('flex', 'flex-1', 'flex-col');
      // The view's own frame is its first child, so it fills the section and its bar sits at the foot.
      await waitFor(() => expect(view.firstElementChild).toHaveClass('view-frame'));
    },
  );
});

describe('what the address names', () => {
  it('opens an unknown kind as IMEI and leaves the address alone', async () => {
    const app = await openProducts('/products?type=banana');
    expect(currentLink(await kindStrip())).toBe('IMEI Service');
    expect(app.location()).toBe('/products?type=banana');
  });

  it('replaces an unknown view with the first one, keeping the kind', async () => {
    const app = await openProducts('/products?view=nothing&type=server&q=x');
    await waitFor(() => expect(app.location()).toBe('/products?view=all&type=server'));
    expect(currentLink(await viewLinks())).toBe('All');
    expect(await servicesTable()).toBeInTheDocument();
  });

  it('replaces a view the role may not use with the first one it may', async () => {
    const app = await openProducts('/products?view=pricing', { permissions: ['catalog:read'] });
    await waitFor(() => expect(app.location()).toBe('/products?view=all'));
    expect(linkTexts(await viewLinks())).toEqual(['All', 'Group']);
  });
});

describe('which views a role sees', () => {
  it('lists the services, the groups and what adding needs with catalog:read and catalog:create', async () => {
    await openProducts('/products', { permissions: ['catalog:read', 'catalog:create'] });
    // No divider and no second group of links: none of the three extra views is open to this role.
    expect(linkTexts(await viewLinks())).toEqual(['All', '+Add Service', 'Group', '+Add Group']);
  });

  it('adds the price grid with pricing:read, and the price rules after the divider', async () => {
    await openProducts('/products', { permissions: ['catalog:read', 'pricing:read'] });
    expect(linkTexts(await viewLinks())).toEqual(['All', 'Pricing', 'Group', 'Price Rules']);
  });

  it('opens the price rules for a role that holds only pricing:read, without the price check', async () => {
    await openProducts('/products', { permissions: ['pricing:read'] });
    expect(linkTexts(await viewLinks())).toEqual(['Price Rules']);
    const links = within(await screen.findByRole('navigation', { name: 'Price rules sections' }));
    expect(currentLink(links)).toBe('Merchant price rules');
    expect(links.getByRole('link', { name: /^Shop price rules/ })).toBeInTheDocument();
    expect(links.queryByRole('link', { name: /^Price check/ })).not.toBeInTheDocument();
  });

  it.each([
    ['storefront:read', 'Shop Publish'],
    ['inventory:read', 'Inventory'],
  ])('opens the one view a role that holds only %s may use: %s', async (permission, label) => {
    await openProducts('/products', { permissions: [permission] });
    expect(linkTexts(await viewLinks())).toEqual([label]);
    expect(currentLink(await viewLinks())).toBe(label);
  });
});

describe('Price Rules', () => {
  const subLinks = () => within(screen.getByRole('navigation', { name: 'Price rules sections' }));

  it('opens the merchant price rules first and moves between the sub-views through the address', async () => {
    const user = userEvent.setup();
    const app = await openProducts('/products?view=rules');
    expect(await screen.findByRole('region', { name: 'Merchant price rules' })).toBeInTheDocument();
    expect(currentLink(subLinks())).toBe('Merchant price rules');
    await user.click(subLinks().getByRole('link', { name: /^Shop price rules/ }));
    await waitFor(() => expect(app.location()).toBe('/products?view=rules&type=imei&tab=shop'));
    expect(await screen.findByRole('region', { name: 'Shop price rules' })).toBeInTheDocument();
    expect(currentLink(subLinks())).toMatch(/^Shop price rules/);
  });

  it('draws the sub-views as plain text links under the page’s own, with no tab strip and no card', async () => {
    await openProducts('/products?view=rules');
    const region = await screen.findByRole('region', { name: 'Merchant price rules' });
    expect(within(region).queryByRole('tablist')).not.toBeInTheDocument();
    expect(within(region).queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist', { name: 'Price rules sections' })).not.toBeInTheDocument();
    expect(region.querySelector('.panel')).toBeNull();
    expect(subLinks().getAllByRole('link')).toHaveLength(3);
  });

  it('tells the proposals that wait as plain words on the Shop price rules link, with no chip', async () => {
    await openProducts('/products?view=rules');
    const link = await screen.findByRole(
      'link',
      { name: 'Shop price rules (3 waiting)' },
      { timeout: 10_000 },
    );
    expect(link.querySelector('.badge, .count, .tag')).toBeNull();
  });

  it('opens the first sub-view for one that is not known', async () => {
    await openProducts('/products?view=rules&tab=nothing');
    expect(await screen.findByRole('region', { name: 'Merchant price rules' })).toBeInTheDocument();
    expect(currentLink(subLinks())).toBe('Merchant price rules');
  });

  it('offers only the services of the kind on the strip in the price check', async () => {
    await openProducts('/products?view=rules&tab=check&type=server');
    const menu = await screen.findByRole('combobox', { name: 'Service' }, { timeout: 10_000 });
    await waitFor(() => expect(within(menu).getAllByRole('option').length).toBeGreaterThan(1));
    const names = within(menu)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(names).toContain('Z3X Credits x10');
    expect(names).not.toContain('AT&T USA Premier Unlock');
  });
});

describe('Shop Publish', () => {
  it('opens the start of the publish runs, with no card around it', async () => {
    await openProducts('/products?view=publish');
    expect(
      await screen.findByRole(
        'heading',
        { level: 2, name: 'Publish services to the shop' },
        { timeout: 10_000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Shop Publish' }).querySelector('.panel')).toBeNull();
  });
});

describe('Inventory', () => {
  it('offers only the services of the kind on the strip in the service filter', async () => {
    await openProducts('/products?view=inventory&type=server');
    const menu = await screen.findByRole('combobox', { name: 'Filter by service' }, { timeout: 10_000 });
    await waitFor(() => expect(within(menu).getAllByRole('option').length).toBeGreaterThan(1));
    const names = within(menu)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(names).toContain('Z3X Credits x10');
    expect(names).not.toContain('AT&T USA Premier Unlock');
  });
});
