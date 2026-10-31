// Tests for the System health page, run through the whole app against the dev mock API: what each permission set sees, and
// the header (freshness, build, range, Refresh, Grafana). The verdict, the key figures and the tabs have their own files.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupHealthMocks } from '../mocks/testing';
import { openHealthPage } from '../test/openHealthPage';
import { SLOW, tabNames, tileNamed, verdictOf } from '../test/pageQueries';
import { recordRequests } from '../test/recordRequests';

setupHealthMocks();
// The page is a lazy chunk and every flow goes through the mock API, so give the first test of a file room.
vi.setConfig({ testTimeout: 30_000 });

describe('permission sets', () => {
  it('shows an owner the header, the verdict, six key figures and all seven tabs, with the Maintenance button', async () => {
    await openHealthPage();
    await verdictOf(/Operational/);
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Maintenance' })).toBeEnabled();
    expect(within(screen.getByRole('region', { name: 'Key figures' })).getAllByRole('group')).toHaveLength(6);
    for (const name of [
      'Uptime 30 days',
      'API p95',
      '5xx rate',
      'Oldest queued job',
      'Orders past SLA',
      'Open alerts',
    ]) {
      expect(tileNamed(name)).toBeInTheDocument();
    }
    expect(tabNames()).toEqual([
      'Overview',
      'API',
      'Orders & suppliers',
      'Queues & jobs',
      'Alerts & incidents',
      'Data stores',
      'Integrity',
    ]);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('shows system:read alone everything but the Alerts tab, no action button, and the read-only note', async () => {
    await openHealthPage({ permissions: ['system:read'] });
    await verdictOf(/Operational/);
    expect(tabNames()).toEqual([
      'Overview',
      'API',
      'Orders & suppliers',
      'Queues & jobs',
      'Data stores',
      'Integrity',
    ]);
    expect(screen.queryByRole('button', { name: /Maintenance/ })).not.toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('read-only access');
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });

  it('shows alerts:read alone only the Alerts tab and a note instead of the verdict, and never asks for the health summary', async () => {
    const reads = recordRequests('get', '/admin/system/health');
    await openHealthPage({ permissions: ['alerts:read'] });
    expect(await screen.findByText(/need the/, undefined, SLOW)).toHaveTextContent('system:read');
    expect(tabNames()).toEqual(['Alerts & incidents']);
    expect(screen.queryByRole('region', { name: 'Key figures' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 2, name: /Operational|Degraded|Outage/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Alerts & incidents' })).toHaveAttribute('aria-selected', 'true');
    // Give a stray request time to show up before saying there was none.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(reads).toHaveLength(0);
  });

  it('lets an incidents reader open the Alerts tab too', async () => {
    await openHealthPage({ permissions: ['incidents:read'] });
    expect(await screen.findByRole('tab', { name: 'Alerts & incidents' }, SLOW)).toBeInTheDocument();
    expect(tabNames()).toEqual(['Alerts & incidents']);
  });

  it('draws no action button for the read-only scenario, which signs in with the read-only role', async () => {
    await openHealthPage({ scenario: 'readonly' });
    await verdictOf(/Degraded/);
    expect(screen.queryByRole('button', { name: /Maintenance/ })).not.toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('read-only access');
  });

  it('disables Maintenance with the missing permission for a role that can change something else', async () => {
    await openHealthPage({ permissions: ['system:read', 'alerts:read', 'alerts:update'] });
    await verdictOf(/Operational/);
    const button = screen.getByRole('button', { name: 'Maintenance' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'You need the system:manage permission');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
});

describe('the header', () => {
  it('shows how fresh the data is, the build, and the range switch with 24h picked', async () => {
    await openHealthPage();
    // The Overview tab's Build card repeats the build, so look in the page header only.
    const header = screen
      .getByRole('heading', { level: 1, name: 'System health' })
      .closest('header') as HTMLElement;
    await within(header).findByText(/^v\d/, undefined, SLOW);
    expect(within(header).getByText(/Updated .* ago|Updated just now/)).toBeInTheDocument();
    expect(within(header).getByText(/refreshes every 15s/)).toBeInTheDocument();
    expect(within(header).getByText('production')).toBeInTheDocument();
    expect(within(header).getByText(/^[0-9a-f]{7}$/)).toHaveClass('mono');
    const range = screen.getByRole('group', { name: 'Time range' });
    expect(
      within(range)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['1h', '6h', '24h', '7d']);
    expect(within(range).getByRole('button', { name: '24h' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('puts the chosen range in the address and keeps the open tab', async () => {
    const user = userEvent.setup();
    const app = await openHealthPage({ route: '/system-health?tab=api' });
    await user.click(screen.getByRole('button', { name: '6h' }));
    expect(app.location()).toBe('/system-health?tab=api&range=6h');
    await user.click(screen.getByRole('button', { name: '24h' }));
    expect(app.location()).toBe('/system-health?tab=api');
  });

  it('reads every health card again at once on Refresh, and is busy until they are done', async () => {
    const user = userEvent.setup();
    const reads = recordRequests('get', '/admin/system/health');
    const orders = recordRequests('get', '/admin/system/orders-health');
    await openHealthPage();
    await waitFor(() => expect(orders.length).toBeGreaterThan(0), SLOW);
    const before = { health: reads.length, orders: orders.length };
    const refresh = screen.getByRole('button', { name: 'Refresh' });
    await user.click(refresh);
    await waitFor(() => expect(reads.length).toBe(before.health + 1), SLOW);
    await waitFor(() => expect(orders.length).toBe(before.orders + 1), SLOW);
    await waitFor(() => expect(refresh).not.toHaveAttribute('aria-busy'), SLOW);
    expect(refresh).toBeEnabled();
  });

  it('shows no Grafana link while its address is not set', async () => {
    await openHealthPage();
    await verdictOf(/Operational/);
    expect(screen.queryByRole('link', { name: /Grafana/ })).not.toBeInTheDocument();
  });

  it('links to Grafana in a new tab when its address is set', async () => {
    // The mock API's cleanup after each test puts the environment back.
    vi.stubEnv('VITE_GRAFANA_URL', 'https://grafana.example.com/d/gsm');
    await openHealthPage();
    const link = await screen.findByRole('link', { name: /Open in Grafana/ });
    expect(link).toHaveAttribute('href', 'https://grafana.example.com/d/gsm');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
