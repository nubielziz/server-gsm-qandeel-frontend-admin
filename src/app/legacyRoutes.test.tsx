// Tests for the old addresses inside the whole app: they redirect (the entry is replaced) before a page's permission gate answers,
// carry their query, and leave the Shop content addresses alone; the retired Commissions page lands on Finance. They assert addresses
// and gates, not what a page shows.
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigationType } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AppProviders } from './App';
import { AppRoutes } from './routes';
import { mockMe, renderApp, setupMockApi, signInAs } from '@/test/renderApp';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });

// Shows how the router last moved (`REPLACE`, `PUSH`, `POP`) and where it is.
function NavigationProbe() {
  const { pathname, search } = useLocation();
  return (
    <p hidden data-testid="navigation">
      {useNavigationType()} {pathname}
      {search}
    </p>
  );
}

// Waits for a page's title, so the lazy chunk of the page the redirect ended on has loaded before the test ends.
const pageTitle = (name?: string) =>
  screen.findByRole('heading', { level: 1, ...(name ? { name } : {}) }, { timeout: 20_000 });

describe('old addresses redirect to Product / Services', () => {
  it.each([
    ['/services', '/products?view=all'],
    ['/services?status=disabled', '/products?view=all&show=disabled'],
    ['/services?q=unlock&belowFloor=true&page=2', '/products?view=all&q=unlock&show=attention&page=2'],
    ['/services?tab=rules', '/products?view=rules&tab=merchant'],
    ['/services?tab=inventory&status=sold&service=16', '/products?view=inventory&status=sold&service=16'],
    ['/catalog', '/products?view=all'],
    [
      '/catalog?q=unlock&categoryId=3&supplierId=2&chip=notonshop',
      '/products?view=all&q=unlock&group=3&api=2&show=offshop',
    ],
    ['/catalog?open=7&section=prices', '/products?view=edit&id=7&part=pricing'],
    ['/catalog?add=6&from=groups', '/products?view=add&supplier=6&from=groups'],
    ['/catalog?view=settings&tab=categories', '/products?view=groups'],
    // The address in the mail about shop price changes.
    ['/catalog?view=settings&tab=shop-prices', '/products?view=rules&tab=shop'],
    ['/catalog?view=settings&tab=resolver&service=4', '/products?view=rules&tab=check&service=4'],
    ['/catalog?view=settings&tab=inventory&service=16', '/products?view=inventory&service=16'],
    ['/catalog?view=publish&run=7', '/products?view=publish&run=7'],
    ['/storefront?tab=publish&run=7', '/products?view=publish&run=7'],
    ['/storefront?tab=pricing&show=all', '/products?view=rules&tab=shop&show=all'],
    ['/storefront?tab=listings&q=unlock', '/products?view=all&q=unlock'],
    ['/storefront?page=2', '/products?view=all&page=2'],
  ])('%s goes to %s', async (old, target) => {
    await signInAs();
    const app = renderApp(old);
    await waitFor(() => expect(app.location()).toBe(target), { timeout: 10_000 });
    await pageTitle();
  });

  it('replaces the entry, so Back does not return to the old address', async () => {
    await signInAs();
    render(
      <MemoryRouter initialEntries={['/catalog?view=settings&tab=categories']}>
        <AppProviders>
          <AppRoutes />
          <NavigationProbe />
        </AppProviders>
      </MemoryRouter>,
    );
    // The redirect is a replace, not a push, so there is no history entry for the old address to go back to.
    await waitFor(
      () => expect(screen.getByTestId('navigation')).toHaveTextContent('REPLACE /products?view=groups'),
      { timeout: 10_000 },
    );
    await pageTitle();
  });

  it('keeps the address when the Product / Services page itself is the one asked for', async () => {
    await signInAs();
    const app = renderApp('/products?view=publish&run=7');
    await pageTitle('Product / Services');
    expect(app.location()).toBe('/products?view=publish&run=7');
  });
});

describe('the retired Commissions page goes to Finance', () => {
  it.each([
    '/commissions',
    '/commissions?tab=accruals&status=accrued',
    '/commissions?tab=agents',
    '/commissions?tab=plans',
    '/commissions?agent=3&status=accrued&page=2',
  ])('%s goes to /finance', async (old) => {
    await signInAs();
    const app = renderApp(old);
    await waitFor(() => expect(app.location()).toBe('/finance'), { timeout: 10_000 });
    expect(await pageTitle('Finance')).toBeInTheDocument();
  });

  it('replaces the entry, so Back does not return to the old address', async () => {
    await signInAs();
    render(
      <MemoryRouter initialEntries={['/commissions?tab=plans']}>
        <AppProviders>
          <AppRoutes />
          <NavigationProbe />
        </AppProviders>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId('navigation')).toHaveTextContent('REPLACE /finance'), {
      timeout: 10_000,
    });
    await pageTitle('Finance');
  });

  it('lets a role that may open Finance follow an old commissions link, with no refusal and no error', async () => {
    mockMe({ permissions: ['ledger:read'] });
    const app = renderApp('/commissions?tab=accruals');
    await waitFor(() => expect(app.location()).toBe('/finance'), { timeout: 10_000 });
    expect(await pageTitle('Finance')).toBeInTheDocument();
    expect(screen.queryByText('You do not have access to this page')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: 'Page not found' })).not.toBeInTheDocument();
  });

  it('does not redirect an address below the old page', async () => {
    mockMe({ permissions: ['*'] });
    const app = renderApp('/commissions/5');
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(app.location()).toBe('/commissions/5');
  });
});

describe('before the permission gate', () => {
  it('lets a role that may open Product / Services but not Shop content follow an old pricing link', async () => {
    // pricing:read opens Product / Services (its shop price rules) and no longer opens Shop content, where the old Retail pricing tab was.
    mockMe({ permissions: ['pricing:read'] });
    const app = renderApp('/storefront?tab=pricing');
    await waitFor(() => expect(app.location()).toBe('/products?view=rules&tab=shop'), {
      timeout: 10_000,
    });
    await pageTitle();
    expect(screen.queryByText('You do not have access to this page')).not.toBeInTheDocument();
  });

  it('lets a role that holds only storefront:read follow an old publish link', async () => {
    mockMe({ permissions: ['storefront:read'] });
    const app = renderApp('/storefront?tab=publish&run=7');
    await waitFor(() => expect(app.location()).toBe('/products?view=publish&run=7'), { timeout: 10_000 });
    await pageTitle();
    expect(screen.queryByText('You do not have access to this page')).not.toBeInTheDocument();
  });

  it.each([
    [['pricing:read'], '/services?belowFloor=true', '/products?view=rules'],
    [['storefront:read'], '/storefront?tab=listings&q=unlock', '/products?view=publish'],
    [['inventory:read'], '/services?tab=categories', '/products?view=inventory'],
    [['pricing:read'], '/catalog?open=7&section=prices', '/products?view=rules'],
  ])(
    'lands a role without catalog:read (%j) on a view it may use after %s',
    async (permissions, old, target) => {
      mockMe({ permissions });
      const app = renderApp(old);
      await waitFor(() => expect(app.location()).toBe(target), { timeout: 10_000 });
      await pageTitle('Product / Services');
      expect(screen.queryByRole('table', { name: 'Services' })).not.toBeInTheDocument();
      expect(screen.queryByText('You do not have access to this page')).not.toBeInTheDocument();
    },
  );

  it('still refuses a role with no Product / Services permission, at the new address', async () => {
    mockMe({ permissions: ['orders:read'] });
    const app = renderApp('/services?q=unlock');
    await waitFor(() => expect(app.location()).toBe('/products?view=all&q=unlock'), { timeout: 10_000 });
    expect(
      await screen.findByText('You do not have access to this page', {}, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('catalog:read or pricing:read or inventory:read or storefront:read'),
    ).toBeInTheDocument();
  });
});

describe('the old Abandoned checkouts address goes to the sales funnel', () => {
  it.each([
    ['/checkouts', '/finance?tab=reports&report=funnel'],
    ['/checkouts?filter=all&q=sam&page=2', '/finance?tab=reports&report=funnel'],
    ['/checkouts?days=90', '/finance?tab=reports&report=funnel&range=90'],
    ['/checkouts?days=7', '/finance?tab=reports&report=funnel&range=7'],
  ])('%s goes to %s', async (old, target) => {
    await signInAs();
    const app = renderApp(old);
    await waitFor(() => expect(app.location()).toBe(target), { timeout: 10_000 });
    await pageTitle('Finance');
    expect(await screen.findByRole('list', { name: /^Sales funnel, last \d+ days$/ })).toBeInTheDocument();
  });

  it('replaces the entry, so Back does not return to the removed page', async () => {
    await signInAs();
    render(
      <MemoryRouter initialEntries={['/checkouts?days=7']}>
        <AppProviders>
          <AppRoutes />
          <NavigationProbe />
        </AppProviders>
      </MemoryRouter>,
    );
    await waitFor(
      () =>
        expect(screen.getByTestId('navigation')).toHaveTextContent(
          'REPLACE /finance?tab=reports&report=funnel&range=7',
        ),
      { timeout: 10_000 },
    );
    await pageTitle('Finance');
  });

  it('lands a role with only reports:growth on the funnel, not on an error', async () => {
    mockMe({ permissions: ['reports:growth'] });
    const app = renderApp('/checkouts');
    await waitFor(() => expect(app.location()).toBe('/finance?tab=reports&report=funnel'), {
      timeout: 10_000,
    });
    await pageTitle('Finance');
    expect(screen.queryByText('You do not have access to this page')).not.toBeInTheDocument();
  });

  it('does not redirect an address below the old page', async () => {
    mockMe({ permissions: ['*'] });
    const app = renderApp('/checkouts/5');
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(app.location()).toBe('/checkouts/5');
  });
});

describe('Shop content addresses', () => {
  it.each([
    ['/storefront?tab=landing', '/storefront?tab=landing'],
    ['/storefront?tab=tac&q=3538', '/storefront?tab=tac&q=3538'],
    ['/storefront?tab=content', '/storefront?tab=content'],
  ])('%s is not redirected', async (address, expected) => {
    await signInAs();
    const app = renderApp(address);
    expect(await pageTitle('Shop content')).toBeInTheDocument();
    expect(app.location()).toBe(expected);
  });

  it('opens the bare page as Shop content and does not send it to Product / Services', async () => {
    await signInAs();
    const app = renderApp('/storefront');
    expect(await pageTitle('Shop content')).toBeInTheDocument();
    expect(app.location()).not.toMatch(/^\/products/);
  });
});

describe('around the redirects', () => {
  it('keeps the old address in the sign-in screen of a signed-out visitor, which then sends them on', async () => {
    const app = renderApp('/services?tab=rules');
    await screen.findByRole('heading', { level: 1, name: 'Sign in' });
    expect(app.location()).toBe('/login?to=%2Fservices%3Ftab%3Drules');
  });

  it.each(['/services/5', '/catalog/5'])(
    'does not redirect an address below the old page (%s)',
    async (address) => {
      mockMe({ permissions: ['*'] });
      const app = renderApp(address);
      expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
      expect(app.location()).toBe(address);
    },
  );

  it('keeps the old Catalog address in the sign-in screen of a signed-out visitor', async () => {
    const app = renderApp('/catalog?view=settings&tab=shop-prices');
    await screen.findByRole('heading', { level: 1, name: 'Sign in' });
    expect(app.location()).toBe('/login?to=%2Fcatalog%3Fview%3Dsettings%26tab%3Dshop-prices');
  });
});
