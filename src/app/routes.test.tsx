// Tests for the route table: every page resource has a route, and the sign-in area forgets the last session's data.
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { renderApp, mockMe, setupMockApi, signInAs } from '@/test/renderApp';
import { AppProviders } from './App';
import { featureManifests } from './features';
import { resources, toPageResource, type PageResource } from './resources';
import { AppRoutes } from './routes';

setupMockApi();

const PAGES = resources.map(toPageResource).filter((page): page is PageResource => page !== undefined);

// Pages whose feature is built (their manifest declares the page) show their own heading instead of the placeholder.
const BUILT: Record<string, string> = Object.fromEntries(
  featureManifests.flatMap(({ page }) => (page ? [[page.name, page.heading]] : [])),
);
// Detail views a feature has built are tested by that feature; the others must still show the placeholder.
const BUILT_DETAIL = new Set(featureManifests.flatMap(({ page }) => (page?.detail ? [page.name] : [])));

describe('routes', () => {
  it.each(PAGES.filter((page) => !(page.name in BUILT)).map((page) => [page.meta.label, page.path] as const))(
    'opens %s at %s',
    async (label, path) => {
      mockMe({ permissions: ['*'] });
      const app = renderApp(path);
      expect(await screen.findByRole('heading', { level: 1, name: label })).toBeInTheDocument();
      expect(await screen.findByText('This page is being ported')).toBeInTheDocument();
      expect(app.location()).toBe(path);
    },
  );

  it.each(
    PAGES.filter((page) => page.name in BUILT).map(
      (page) => [page.meta.label, page.path, BUILT[page.name]] as const,
    ),
  )(
    'opens the built page %s at %s',
    async (_label, path, heading) => {
      // A built page calls the API, so the mock session must be signed in.
      await signInAs();
      const app = renderApp(path);
      // A built page is a lazy chunk, which loads slowly while the whole suite runs in parallel.
      const title = await screen.findByRole('heading', { level: 1, name: heading }, { timeout: 10_000 });
      expect(title).toBeInTheDocument();
      expect(screen.queryByText('This page is being ported')).not.toBeInTheDocument();
      expect(app.location()).toBe(path);
    },
    20_000,
  );

  it.each(
    PAGES.filter((page) => page.detailPath && !BUILT_DETAIL.has(page.name)).map(
      (page) => [page.meta.label, page.name] as const,
    ),
  )('opens the %s detail view', async (label, name) => {
    mockMe({ permissions: ['*'] });
    renderApp(`/${name}/42`);
    expect(await screen.findByRole('heading', { level: 1, name: label })).toBeInTheDocument();
    expect(await screen.findByText('This page is being ported')).toBeInTheDocument();
  });
});

describe('sign-in area', () => {
  // Hands the query client to the test, so it can seed and read the cache the way a previous session would have.
  function ClientProbe({ onClient }: { onClient: (client: QueryClient) => void }) {
    const client = useQueryClient();
    useState(() => onClient(client));
    return null;
  }

  it('drops what the last session loaded, including the staff member’s identity, but keeps the sign-in check', async () => {
    let client: QueryClient | undefined;
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AppProviders>
          <ClientProbe
            onClient={(found) => {
              client = found;
              found.setQueryData(['data', 'orders', 'list'], [{ id: 1 }]);
              found.setQueryData(['access', 'audit', 'list'], { can: true });
              found.setQueryData(['api', 'system', 'health'], { status: 'ok' });
              found.setQueryData(['auth', 'identity'], { name: 'Previous Operator' });
              found.setQueryData(['auth', 'permissions'], ['*']);
            }}
          />
          <AppRoutes />
        </AppProviders>
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { level: 1, name: 'Sign in' });
    expect(client?.getQueryData(['data', 'orders', 'list'])).toBeUndefined();
    expect(client?.getQueryData(['access', 'audit', 'list'])).toBeUndefined();
    expect(client?.getQueryData(['api', 'system', 'health'])).toBeUndefined();
    expect(client?.getQueryData(['auth', 'identity'])).toBeUndefined();
    expect(client?.getQueryData(['auth', 'permissions'])).toBeUndefined();
    // The answer to "am I signed in?" is what the sign-in area is showing, so it stays.
    expect(client?.getQueryData(['auth', 'check'])).toMatchObject({ authenticated: false });
  });
});
