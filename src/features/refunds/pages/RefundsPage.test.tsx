// Tests for the Refunds & disputes page, run through the whole app against the dev mock API: the tabs and their counts, the strip,
// the refunds table with its status filter, sorting, the order drawer that opens in place, deep links, and what the staff
// member's permissions hide.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import { dialogNamed, openRefunds, rowWith, sectionTabs, tableNamed, tabTexts } from '../test/refundsPage';

setupMockApi();
// The page is a lazy chunk and every flow goes through the mock API, so give the tests room.
vi.setConfig({ testTimeout: 20_000 });

const strip = () => within(screen.getByRole('region', { name: 'Refund and dispute figures' }));

describe('the header, the strip and the tabs', () => {
  it('opens on Refunds with the three tabs and the chips for what waits for a person', async () => {
    await openRefunds();
    await waitFor(() => expect(tabTexts()).toEqual(['Refunds4', 'Card disputes2', 'Payments']));
    expect(sectionTabs().getByRole('tab', { name: /^Refunds/ })).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByText(
        'Money going back to storefront customers, and the bank claims that try to take it back.',
      ),
    ).toBeInTheDocument();
  });

  it('shows the four figures from the server’s counts and totals', async () => {
    await openRefunds();
    expect(await strip().findByText('$49 · 1 failed at the gateway')).toBeInTheDocument();
    const cells = strip();
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

  it('keeps the tab in the address and drops the default', async () => {
    const user = userEvent.setup();
    const app = await openRefunds();
    await user.click(sectionTabs().getByRole('tab', { name: /^Card disputes/ }));
    expect(app.location()).toBe('/refunds?tab=disputes');
    expect(await screen.findByRole('table', { name: 'Card disputes' })).toBeInTheDocument();
    await user.click(sectionTabs().getByRole('tab', { name: 'Payments' }));
    expect(app.location()).toBe('/refunds?tab=payments');
    expect(await screen.findByRole('table', { name: 'Storefront payments' })).toBeInTheDocument();
    await user.click(sectionTabs().getByRole('tab', { name: /^Refunds/ }));
    expect(app.location()).toBe('/refunds');
    expect(await screen.findByRole('table', { name: 'Refunds' })).toBeInTheDocument();
  });

  it('honours the deep links other pages use, without rewriting the address', async () => {
    const app = await openRefunds('/refunds?tab=disputes');
    expect(await screen.findByRole('table', { name: 'Card disputes' })).toBeInTheDocument();
    expect(sectionTabs().getByRole('tab', { name: /^Card disputes/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(app.location()).toBe('/refunds?tab=disputes');
  });
});

describe('the refunds table', () => {
  it('lists the refunds newest first with the demo’s columns', async () => {
    await openRefunds();
    const table = await tableNamed('Refunds');
    await table.findByText('RF-1007');
    expect(table.getAllByRole('row')).toHaveLength(12); // the header and 11 refunds
    expect(table.getAllByRole('row')[1]).toHaveTextContent('RF-1007');
    for (const name of ['Refund', 'Customer', 'Reason', 'Amount', 'Status', 'When']) {
      expect(table.getByRole('columnheader', { name: new RegExp(name) })).toBeInTheDocument();
    }
  });

  it('shows a request with its order, customer, the amount in the customer’s currency and the dollars below', async () => {
    await openRefunds();
    const row = await rowWith('Refunds', 'RF-1007');
    expect(row.getByRole('button', { name: 'SF-20467' })).toBeInTheDocument();
    expect(row.getByRole('link', { name: 'Priya Nair' })).toHaveAttribute('href', '/customers/11');
    expect(row.getByText('Unlock did not work: phone still asks for a code')).toBeInTheDocument();
    expect(row.getByText('CA$27.39')).toBeInTheDocument();
    expect(row.getByText('$19.99')).toBeInTheDocument();
    expect(row.getByText('Needs approval')).toBeInTheDocument();
    expect(row.getByText('Customer')).toBeInTheDocument();
    expect(row.getByRole('button', { name: 'Approve…' })).toBeEnabled();
    expect(row.getByRole('button', { name: 'Decline' })).toBeEnabled();
  });

  it('marks a partial refund, an automatic one and a failed one with the gateway’s note', async () => {
    await openRefunds();
    const partial = await rowWith('Refunds', 'RF-1010');
    expect(partial.getByText('Partial')).toBeInTheDocument();
    expect(partial.getByText('Lina S.')).toBeInTheDocument();
    expect(partial.queryByRole('button', { name: /Approve|Decline|Retry/ })).not.toBeInTheDocument();
    const automatic = await rowWith('Refunds', 'RF-1006');
    expect(automatic.getByText('System (automatic)')).toBeInTheDocument();
    const failed = await rowWith('Refunds', 'RF-1011');
    expect(failed.getByText('Failed at gateway')).toBeInTheDocument();
    expect(failed.getByText(/Gateway error: the card issuer declined the credit/)).toHaveClass(
      'text-crit-fg',
    );
    expect(failed.getByRole('button', { name: 'Retry' })).toBeEnabled();
    expect(failed.queryByRole('button', { name: 'Approve…' })).not.toBeInTheDocument();
  });

  it('sorts on the server when a column header is pressed, and keeps the sort in the address', async () => {
    const user = userEvent.setup();
    const app = await openRefunds();
    await user.click(await screen.findByRole('button', { name: 'Amount' }));
    expect(app.location()).toBe('/refunds?sort=amount&dir=asc');
    await waitFor(async () =>
      expect((await tableNamed('Refunds')).getAllByRole('row')[1]).toHaveTextContent('RF-1011'),
    );
    await user.click(screen.getByRole('button', { name: 'Amount' }));
    expect(app.location()).toBe('/refunds?sort=amount&dir=desc');
    await waitFor(async () =>
      expect((await tableNamed('Refunds')).getAllByRole('row')[1]).toHaveTextContent('RF-1004'),
    );
  });
});

describe('the status filter', () => {
  it('shows only the requests that wait for approval for the dashboard’s link', async () => {
    const app = await openRefunds('/refunds?tab=refunds&status=requested');
    const table = await tableNamed('Refunds');
    await waitFor(() => expect(table.getAllByRole('row')).toHaveLength(4)); // the header and 3 requests
    expect(screen.getByRole('button', { name: 'Needs approval' })).toHaveAttribute('aria-pressed', 'true');
    expect(table.queryByText('RF-1010')).not.toBeInTheDocument();
    expect(app.location()).toBe('/refunds?tab=refunds&status=requested');
  });

  it('shows the refunds that failed at the gateway for the other link', async () => {
    await openRefunds('/refunds?tab=refunds&status=failed');
    const table = await tableNamed('Refunds');
    await waitFor(() => expect(table.getAllByRole('row')).toHaveLength(2));
    expect(table.getByText('RF-1011')).toBeInTheDocument();
  });

  it('writes the filter to the address, drops it for All, and offers Show all on an empty result', async () => {
    const user = userEvent.setup();
    const app = await openRefunds();
    await user.click(screen.getByRole('button', { name: 'Refunded' }));
    expect(app.location()).toBe('/refunds?status=completed');
    const table = await tableNamed('Refunds');
    await waitFor(() => expect(table.getAllByRole('row')).toHaveLength(8));

    await user.click(screen.getByRole('button', { name: 'Declined' }));
    expect(app.location()).toBe('/refunds?status=rejected');
    expect(await screen.findByText('No refunds with this status')).toBeInTheDocument();
    expect(screen.getByText('Choose another status to see more.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show all' }));
    expect(app.location()).toBe('/refunds');
    expect(await (await tableNamed('Refunds')).findByText('RF-1007')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('ignores a status it does not know', async () => {
    await openRefunds('/refunds?status=paid');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    expect(await (await tableNamed('Refunds')).findByText('RF-1007')).toBeInTheDocument();
  });
});

describe('links to the order and the customer', () => {
  it('opens the order’s drawer in place, keeping the filters in the address', async () => {
    const user = userEvent.setup();
    const app = await openRefunds('/refunds?status=requested');
    const row = await rowWith('Refunds', 'RF-1007');
    await user.click(row.getByRole('button', { name: 'SF-20467' }));
    expect(app.location()).toBe('/refunds?status=requested&order=20467');
    const drawer = await dialogNamed('SF-20467');
    expect(await drawer.findByRole('heading', { name: 'Timeline' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Refunds & disputes' })).toBeInTheDocument();
  });

  it('shows order numbers as text and offers no drawer to a staff member who cannot read orders', async () => {
    await openRefunds('/refunds', { permissions: ['refunds:read', 'refunds:approve'] });
    const row = await rowWith('Refunds', 'RF-1007');
    expect(row.getByText('SF-20467')).toBeInTheDocument();
    expect(row.queryByRole('button', { name: 'SF-20467' })).not.toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('shows only the tabs the staff member may read, and falls back to the first one', async () => {
    const app = await openRefunds('/refunds?tab=refunds', { permissions: ['disputes:read'] });
    await waitFor(() => expect(tabTexts()).toEqual(['Card disputes2']));
    expect(await screen.findByRole('table', { name: 'Card disputes' })).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Refunds' })).not.toBeInTheDocument();
    expect(app.location()).toBe('/refunds?tab=refunds');
    // Only the figure the role can fill is left in the strip.
    expect(strip().getByText('Card disputes open')).toBeInTheDocument();
    expect(strip().queryByText('Waiting for you')).not.toBeInTheDocument();
    expect(strip().queryByText('Lost to chargebacks')).not.toBeInTheDocument();
  });

  it('opens the payments tab with the finance report permission alone', async () => {
    await openRefunds('/refunds?tab=payments', { permissions: ['reports:finance'] });
    expect(await screen.findByRole('table', { name: 'Payment methods compared' })).toBeInTheDocument();
    expect(tabTexts()).toEqual(['Payments']);
    expect(strip().getByText('Lost to chargebacks')).toBeInTheDocument();
  });

  it('disables the decisions, naming the permission, for a staff member who can only read', async () => {
    await openRefunds('/refunds', { permissions: ['refunds:read'] });
    const row = await rowWith('Refunds', 'RF-1007');
    for (const name of ['Approve…', 'Decline']) {
      const button = row.getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'You need the refunds:approve permission');
    }
    const failed = await rowWith('Refunds', 'RF-1011');
    expect(failed.getByRole('button', { name: 'Retry' })).toBeDisabled();
  });
});
