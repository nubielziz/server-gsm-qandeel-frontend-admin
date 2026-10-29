// Test helpers that render screens inside the whole app: Refine, the real providers, the router and the shell.
// They use createElement instead of JSX because the file holds functions, not components (Fast Refresh rule).
import { Authenticated } from '@refinedev/core';
import { render } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { MemoryRouter, Outlet, Route, Routes, useLocation } from 'react-router';
import { AppProviders } from '@/app/App';
import { AppShell } from '@/app/layout/AppShell';
import { AppRoutes } from '@/app/routes';

export * from './mockApi';

// Shows where the router is, so a test can read the path and query without a real address bar.
function LocationProbe() {
  const { pathname, search } = useLocation();
  return createElement('p', { hidden: true, 'data-testid': 'location' }, `${pathname}${search}`);
}

function mount(route: string, content: ReactNode) {
  const view = render(
    createElement(
      MemoryRouter,
      { initialEntries: [route] },
      createElement(AppProviders, null, content, createElement(LocationProbe)),
    ),
  );
  return { ...view, location: () => view.getByTestId('location').textContent };
}

/** Renders the app's providers and routes at `route`. `location()` reads the current path and query. */
export function renderApp(route: string) {
  return mount(route, createElement(AppRoutes));
}

/**
 * Renders the shell around routes of the test's own (a page that needs a record name, or one that crashes), with the
 * real providers. `routes` are <Route> elements; the staff member must already be signed in or mocked with `mockMe`.
 */
export function renderShell(route: string, routes: ReactNode) {
  const shell = createElement(
    Authenticated,
    { key: 'shell', fallback: null },
    createElement(AppShell, null, createElement(Outlet)),
  );
  return mount(route, createElement(Routes, null, createElement(Route, { element: shell }, routes)));
}
