// Tests for the maintenance banner of the app shell: it shows on every page while maintenance is on, only for staff with
// system:read, and links to the System health page (except on that page itself).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { setMockScenario } from '@/mocks/scenario';
import { mockMe, renderApp, renderShell } from '@/test/renderApp';
import { setupHealthMocks } from '../mocks/testing';
import { SLOW } from '../test/pageQueries';
import { recordRequests } from '../test/recordRequests';

setupHealthMocks();
vi.setConfig({ testTimeout: 30_000 });

const PLAIN = <Route path="/plain" element={<p>A plain page</p>} />;

/** The banner is the status region that holds the "Maintenance is on for…" sentence. */
async function findBanner() {
  const sentence = await screen.findByText(/^Maintenance is on for/, undefined, SLOW);
  const banner = sentence.closest('[role="status"]');
  if (!banner) throw new Error('The sentence is not inside a status region.');
  return within(banner as HTMLElement);
}

describe('MaintenanceBanner', () => {
  it('shows on another page while maintenance is on: what is closed, what customers see, since when and a Manage link', async () => {
    setMockScenario('maintenance');
    renderApp('/dashboard');
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' }, SLOW);
    const banner = await findBanner();
    expect(banner.getByText('Maintenance is on for checkout.')).toBeInTheDocument();
    expect(banner.getByText(/^Customers see “.+”$/)).toBeInTheDocument();
    expect(banner.getByText(/Since .* by Dana M\. · Expected end /)).toBeInTheDocument();
    expect(banner.getByRole('link', { name: 'Manage' })).toHaveAttribute('href', '/system-health');
  });

  it('opens the System health page from Manage, where the banner stays but its link goes', async () => {
    setMockScenario('maintenance');
    const user = userEvent.setup();
    const app = renderApp('/dashboard');
    await user.click((await findBanner()).getByRole('link', { name: 'Manage' }));
    await screen.findByRole('heading', { level: 1, name: 'System health' }, SLOW);
    expect(app.location()).toBe('/system-health');
    const banner = await findBanner();
    expect(banner.queryByRole('link', { name: 'Manage' })).not.toBeInTheDocument();
    // The header button says the same thing in its own words.
    expect(await screen.findByRole('button', { name: 'Maintenance is on' }, SLOW)).toBeInTheDocument();
  });

  it('shows nothing while maintenance is off', async () => {
    const reads = recordRequests('get', '/admin/system/health');
    renderShell('/plain', PLAIN);
    await screen.findByText('A plain page');
    await waitFor(() => expect(reads.length).toBeGreaterThan(0), SLOW);
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(screen.queryByText(/^Maintenance is on for/)).not.toBeInTheDocument();
  });

  it('never asks for the health summary without system:read, so shows nothing there', async () => {
    setMockScenario('maintenance');
    mockMe({ permissions: ['orders:read'] });
    const reads = recordRequests('get', '/admin/system/health');
    renderShell('/plain', PLAIN);
    await screen.findByText('A plain page');
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(reads).toHaveLength(0);
    expect(screen.queryByText(/^Maintenance is on for/)).not.toBeInTheDocument();
  });
});
