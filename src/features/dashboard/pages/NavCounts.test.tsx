// Tests for the sidebar counts the dashboard feeds into the app shell, on a page that has no data of its own: the numbers
// and late dots, zero counts left out, no request without `dashboard:read`, the shared request, and the one-minute refresh.
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { Route } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { DASHBOARD_KEY } from '@/lib/query';
import { mockMe, renderApp, renderShell, setupMockApi, signInAs } from '@/test/renderApp';
import { answerDashboard } from '../test/answers';
import { openDashboard } from '../test/dashboardPage';
import { dashboardFixture } from '../test/fixtures';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

async function primaryNav() {
  return within(await screen.findByRole('navigation', { name: 'Primary' }));
}

// Hands the app's query client to the test, so it can read the cache the sidebar's query lives in.
function ClientProbe({ onClient }: { onClient: (client: QueryClient) => void }) {
  const client = useQueryClient();
  useState(() => onClient(client));
  return null;
}

describe('sidebar counts', () => {
  it('shows each count beside its page, with a red dot and words where items are late', async () => {
    answerDashboard(dashboardFixture());
    await signInAs();
    mockMe({ permissions: ['*'] });
    renderApp('/audit');
    const nav = await primaryNav();
    const link = (name: RegExp) => nav.getByRole('link', { name });

    await waitFor(() => expect(within(link(/^Orders/)).getByText('12')).toBeInTheDocument());
    expect(within(link(/^Orders/)).getByText('12')).toHaveClass('count');
    expect(within(link(/^Orders/)).getByText('3 past SLA')).toHaveClass('sr-only');
    expect(within(link(/^Finance/)).getByText('2')).toBeInTheDocument();
    expect(within(link(/^Merchants/)).getByText('1')).toBeInTheDocument();
    expect(within(link(/^Support/)).getByText('7')).toBeInTheDocument();
    expect(within(link(/^Support/)).getByText('2 past the reply target')).toBeInTheDocument();
    expect(within(link(/^Refunds/)).getByText('5')).toBeInTheDocument();
    expect(within(link(/^Refunds/)).getByText('1 dispute deadlines within 3 days')).toBeInTheDocument();
    expect(within(link(/^Risk/)).getByText('4')).toBeInTheDocument();
    // Finance, Merchants and Risk have nothing late: a number and no dot.
    expect(link(/^Finance/).querySelector('.dot')).toBeNull();
    expect(link(/^Risk/).querySelector('.dot')).toBeNull();
    // Pages the dashboard has no count for show none.
    for (const name of [/^Dashboard/, /^Customers/, /^Settings/, /^Audit log/]) {
      expect(link(name).querySelector('.count')).toBeNull();
    }
  });

  it('leaves out a page whose count is zero', async () => {
    answerDashboard(
      dashboardFixture({
        navCounts: {
          orders: { open: 0, pastSla: 0 },
          finance: { pendingDeposits: 0 },
          merchants: { pendingApproval: 0 },
          support: { open: 0, late: 0 },
          refunds: { open: 0, disputesDueSoon: 0 },
          risk: { held: 1 },
        },
      }),
    );
    await signInAs();
    mockMe({ permissions: ['*'] });
    renderApp('/audit');
    const nav = await primaryNav();
    await waitFor(() =>
      expect(within(nav.getByRole('link', { name: /^Risk/ })).getByText('1')).toBeInTheDocument(),
    );
    expect(screen.getByRole('navigation', { name: 'Primary' }).querySelectorAll('.count')).toHaveLength(1);
  });

  it('shows the same numbers as the Orders page: the seed has 48 open orders', async () => {
    await signInAs();
    mockMe({ permissions: ['*'] });
    renderApp('/audit');
    const nav = await primaryNav();
    await waitFor(() =>
      expect(within(nav.getByRole('link', { name: /^Orders/ })).getByText('48')).toBeInTheDocument(),
    );
    expect(within(nav.getByRole('link', { name: /^Risk/ })).getByText('4')).toBeInTheDocument();
    expect(within(nav.getByRole('link', { name: /^Support/ })).getByText('10')).toBeInTheDocument();
  });

  it('makes no request, and shows no counts, without dashboard:read', async () => {
    const seen = answerDashboard(dashboardFixture());
    await signInAs();
    mockMe({ permissions: ['audit:read'] });
    renderApp('/audit');
    const nav = await primaryNav();
    expect(await nav.findByRole('link', { name: 'Audit log' })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(seen).toHaveLength(0);
    expect(screen.getByRole('navigation', { name: 'Primary' }).querySelectorAll('.count')).toHaveLength(0);
  });

  it('shares one request with the dashboard page for the default view', async () => {
    const seen = answerDashboard(dashboardFixture());
    await openDashboard();
    const nav = await primaryNav();
    await waitFor(() =>
      expect(within(nav.getByRole('link', { name: /^Orders/ })).getByText('12')).toBeInTheDocument(),
    );
    expect(await screen.findByRole('region', { name: 'Key figures for the last 7D' })).toBeInTheDocument();
    expect(seen).toHaveLength(1);
  });

  it('keeps the sidebar on the default view when the page shows another period', async () => {
    const seen = answerDashboard(dashboardFixture());
    await openDashboard('/dashboard?scope=b2c&days=14');
    await waitFor(() => expect(seen).toHaveLength(2));
    expect(seen.map((url) => url.search).sort()).toEqual(['?scope=all&days=7', '?scope=b2c&days=14']);
  });

  it('asks again every minute', async () => {
    answerDashboard(dashboardFixture());
    await signInAs();
    mockMe({ permissions: ['*'] });
    let client: QueryClient | undefined;
    renderShell(
      '/audit',
      <Route
        path="/audit"
        element={
          <ClientProbe
            onClient={(found) => {
              client = found;
            }}
          />
        }
      />,
    );
    const nav = await primaryNav();
    await waitFor(() =>
      expect(within(nav.getByRole('link', { name: /^Orders/ })).getByText('12')).toBeInTheDocument(),
    );
    const intervals = (client as QueryClient)
      .getQueryCache()
      .findAll({ queryKey: DASHBOARD_KEY })
      .flatMap((query) => query.observers.map((observer) => observer.options.refetchInterval));
    expect(intervals).toEqual([60_000]);
  });
});
