// Tests for the old addresses inside the whole app: they redirect (the entry is replaced) before a page's permission gate answers,
// carry their query, and leave the Shop content addresses alone. They assert addresses and gates, not what a page shows.
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

describe('old addresses redirect to Catalog', () => {
  it.each([
    ['/services', '/catalog'],
    ['/services?status=disabled', '/catalog?chip=off'],
    ['/services?q=unlock&belowFloor=true&page=2', '/catalog?q=unlock&belowFloor=true&page=2'],
    ['/services?tab=rules', '/catalog?view=settings&tab=rules'],
    [
      '/services?tab=inventory&status=sold&service=16',
      '/catalog?view=settings&tab=inventory&status=sold&service=16',
    ],
    ['/storefront?tab=publish&run=7', '/catalog?view=publish&run=7'],
    ['/storefront?tab=pricing&show=all', '/catalog?view=settings&tab=shop-prices&show=all'],
    ['/storefront?tab=listings&q=unlock', '/catalog?shop=on&q=unlock'],
    ['/storefront?page=2', '/catalog?shop=on&page=2'],
  ])('%s goes to %s', async (old, target) => {
    await signInAs();
    const app = renderApp(old);
    await waitFor(() => expect(app.location()).toBe(target), { timeout: 10_000 });
    await pageTitle();
  });

  it('replaces the entry, so Back does not return to the old address', async () => {
    await signInAs();
    render(
      <MemoryRouter initialEntries={['/services?tab=categories']}>
        <AppProviders>
          <AppRoutes />
          <NavigationProbe />
        </AppProviders>
      </MemoryRouter>,
    );
    // The redirect is a replace, not a push, so there is no history entry for the old address to go back to.
    await waitFor(
      () =>
        expect(screen.getByTestId('navigation')).toHaveTextContent(
          'REPLACE /catalog?view=settings&tab=categories',
        ),
      { timeout: 10_000 },
    );
    await pageTitle();
  });

  it('keeps the address when the Catalog page itself is the one asked for', async () => {
    await signInAs();
    const app = renderApp('/catalog?view=publish&run=7');
    await pageTitle();
    expect(app.location()).toBe('/catalog?view=publish&run=7');
  });
});

describe('before the permission gate', () => {
  it('lets a role that may open Catalog but not Shop content follow an old pricing link', async () => {
    // pricing:read opens Catalog (its shop price rules) and no longer opens Shop content, where the old Retail pricing tab was.
    mockMe({ permissions: ['pricing:read'] });
    const app = renderApp('/storefront?tab=pricing');
    await waitFor(() => expect(app.location()).toBe('/catalog?view=settings&tab=shop-prices'), {
      timeout: 10_000,
    });
    await pageTitle();
    expect(screen.queryByText('You do not have access to this page')).not.toBeInTheDocument();
  });

  it('lets a role that holds only storefront:read follow an old publish link', async () => {
    mockMe({ permissions: ['storefront:read'] });
    const app = renderApp('/storefront?tab=publish&run=7');
    await waitFor(() => expect(app.location()).toBe('/catalog?view=publish&run=7'), { timeout: 10_000 });
    await pageTitle();
    expect(screen.queryByText('You do not have access to this page')).not.toBeInTheDocument();
  });

  it.each([
    [['pricing:read'], '/services?belowFloor=true', '/catalog?view=settings'],
    [['storefront:read'], '/storefront?tab=listings&q=unlock', '/catalog?view=publish'],
    [['inventory:read'], '/services?tab=categories', '/catalog?view=settings&tab=categories'],
  ])(
    'lands a role without catalog:read (%j) on a view it may use after %s',
    async (permissions, old, target) => {
      mockMe({ permissions });
      const app = renderApp(old);
      await waitFor(() => expect(app.location()).toBe(target), { timeout: 10_000 });
      await pageTitle('Catalog');
      expect(screen.queryByRole('table', { name: 'Services' })).not.toBeInTheDocument();
      expect(screen.queryByText('You do not have access to this page')).not.toBeInTheDocument();
    },
  );

  it('still refuses a role with no Catalog permission, at the new address', async () => {
    mockMe({ permissions: ['orders:read'] });
    const app = renderApp('/services?q=unlock');
    await waitFor(() => expect(app.location()).toBe('/catalog?q=unlock'), { timeout: 10_000 });
    expect(
      await screen.findByText('You do not have access to this page', {}, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('catalog:read or pricing:read or inventory:read or storefront:read'),
    ).toBeInTheDocument();
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

  it('opens the bare page as Shop content and does not send it to Catalog', async () => {
    await signInAs();
    const app = renderApp('/storefront');
    expect(await pageTitle('Shop content')).toBeInTheDocument();
    expect(app.location()).not.toMatch(/^\/catalog/);
  });
});

describe('around the redirects', () => {
  it('keeps the old address in the sign-in screen of a signed-out visitor, which then sends them on', async () => {
    const app = renderApp('/services?tab=rules');
    await screen.findByRole('heading', { level: 1, name: 'Sign in' });
    expect(app.location()).toBe('/login?to=%2Fservices%3Ftab%3Drules');
  });

  it('does not redirect an address below the old page', async () => {
    mockMe({ permissions: ['*'] });
    const app = renderApp('/services/5');
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(app.location()).toBe('/services/5');
  });
});
