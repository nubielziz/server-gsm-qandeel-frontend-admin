// Tests for the refund and dispute figures on the Overview of the Money page, run through the whole app against the dev mock API: the four
// figures built from the server's counts and totals, and the figures a role cannot fill left out.
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import { openRefunds } from '../test/refundsPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

// The Overview mounts after the page has loaded the refunds views, so the strip is waited for.
const strip = async () => within(await screen.findByRole('region', { name: 'Refund and dispute figures' }));

describe('the figures on the Overview', () => {
  it('shows the four figures from the server’s counts and totals', async () => {
    await openRefunds('/money');
    const cells = await strip();
    expect(await cells.findByText('$49 · 1 failed at the gateway')).toBeInTheDocument();
    expect(cells.getByText('Refunded, 30 days')).toBeInTheDocument();
    expect(await cells.findByText(/^\d+ refunds · [\d.]+% of sales$/)).toBeInTheDocument();
    expect(cells.getByText('Waiting for you')).toBeInTheDocument();
    expect(cells.getByText('Card disputes open')).toBeInTheDocument();
    expect(await cells.findByText(/^Evidence for DP-2004 due in /)).toBeInTheDocument();
    expect(cells.getByText('Lost to chargebacks')).toBeInTheDocument();
    expect(await cells.findByText('$46')).toBeInTheDocument();
    expect(cells.getByText('All time, with the dispute fees')).toBeInTheDocument();
    // The next deadline is inside three days, so the figure is in the critical colour.
    expect(cells.getByText('3')).toHaveClass('text-crit-fg');
  });

  it('leaves out the figures a role cannot fill', async () => {
    await openRefunds('/money', { permissions: ['disputes:read'] });
    const cells = await strip();
    expect(await cells.findByText('Card disputes open')).toBeInTheDocument();
    expect(cells.queryByText('Waiting for you')).not.toBeInTheDocument();
    expect(cells.queryByText('Lost to chargebacks')).not.toBeInTheDocument();
  });

  it('shows the money figure alone to a role with only the finance report permission', async () => {
    await openRefunds('/money', { permissions: ['reports:finance'] });
    const cells = await strip();
    expect(await cells.findByText('Lost to chargebacks')).toBeInTheDocument();
    expect(cells.queryByText('Card disputes open')).not.toBeInTheDocument();
  });
});
