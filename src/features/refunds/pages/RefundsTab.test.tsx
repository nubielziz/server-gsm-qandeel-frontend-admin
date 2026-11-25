// Tests for the Refunds view of the Money page (Money back), run through the whole app against the dev mock API: the refunds table with its
// status filter, sorting, the order drawer that opens in place, the addresses other pages link to, and what the permissions disable.
// The figures, the link counts and the other views are tested where they live (RefundsOverview, the Money page, the other tabs).
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import { REFUNDS_VIEW, dialogNamed, openRefunds, rowWith, tableNamed } from '../test/refundsPage';

setupMockApi();
// The page is a lazy chunk and every flow goes through the mock API, so give the tests room.
vi.setConfig({ testTimeout: 20_000 });

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
    expect(row.getByRole('link', { name: 'Priya Nair' })).toHaveAttribute('href', '/accounts/111');
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
    expect(app.location()).toBe('/money?view=refunds&sort=amount&dir=asc');
    await waitFor(async () =>
      expect((await tableNamed('Refunds')).getAllByRole('row')[1]).toHaveTextContent('RF-1011'),
    );
    await user.click(screen.getByRole('button', { name: 'Amount' }));
    expect(app.location()).toBe('/money?view=refunds&sort=amount&dir=desc');
    await waitFor(async () =>
      expect((await tableNamed('Refunds')).getAllByRole('row')[1]).toHaveTextContent('RF-1004'),
    );
  });
});

describe('the status filter', () => {
  it('shows only the requests that wait for approval for the dashboard’s link', async () => {
    const app = await openRefunds('/money?view=refunds&status=requested');
    const table = await tableNamed('Refunds');
    await waitFor(() => expect(table.getAllByRole('row')).toHaveLength(4)); // the header and 3 requests
    expect(screen.getByRole('button', { name: 'Needs approval' })).toHaveAttribute('aria-pressed', 'true');
    expect(table.queryByText('RF-1010')).not.toBeInTheDocument();
    expect(app.location()).toBe('/money?view=refunds&status=requested');
  });

  it('shows the refunds that failed at the gateway for the other link', async () => {
    await openRefunds('/money?view=refunds&status=failed');
    const table = await tableNamed('Refunds');
    await waitFor(() => expect(table.getAllByRole('row')).toHaveLength(2));
    expect(table.getByText('RF-1011')).toBeInTheDocument();
  });

  it('writes the filter to the address, drops it for All, and offers Show all on an empty result', async () => {
    const user = userEvent.setup();
    const app = await openRefunds();
    await user.click(await screen.findByRole('button', { name: 'Refunded' }));
    expect(app.location()).toBe('/money?view=refunds&status=completed');
    const table = await tableNamed('Refunds');
    await waitFor(() => expect(table.getAllByRole('row')).toHaveLength(8));

    await user.click(screen.getByRole('button', { name: 'Declined' }));
    expect(app.location()).toBe('/money?view=refunds&status=rejected');
    expect(await screen.findByText('No refunds with this status')).toBeInTheDocument();
    expect(screen.getByText('Choose another status to see more.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show all' }));
    expect(app.location()).toBe('/money?view=refunds');
    expect(await (await tableNamed('Refunds')).findByText('RF-1007')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('ignores a status it does not know', async () => {
    await openRefunds('/money?view=refunds&status=paid');
    expect(await screen.findByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    expect(await (await tableNamed('Refunds')).findByText('RF-1007')).toBeInTheDocument();
  });
});

describe('links to the order and the customer', () => {
  it('opens the order’s drawer in place, keeping the filters in the address', async () => {
    const user = userEvent.setup();
    const app = await openRefunds('/money?view=refunds&status=requested');
    const row = await rowWith('Refunds', 'RF-1007');
    await user.click(row.getByRole('button', { name: 'SF-20467' }));
    expect(app.location()).toBe('/money?view=refunds&status=requested&order=20467');
    const drawer = await dialogNamed('SF-20467');
    expect(await drawer.findByRole('heading', { name: 'Timeline' })).toBeInTheDocument();
    // The page stays the Money page: opening an order changes the address, not the view.
    expect(screen.getByRole('heading', { level: 1, name: 'Money' })).toBeInTheDocument();
  });

  it('shows order numbers as text and offers no drawer to a staff member who cannot read orders', async () => {
    await openRefunds(REFUNDS_VIEW, { permissions: ['refunds:read', 'refunds:approve'] });
    const row = await rowWith('Refunds', 'RF-1007');
    expect(row.getByText('SF-20467')).toBeInTheDocument();
    expect(row.queryByRole('button', { name: 'SF-20467' })).not.toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('disables the decisions, naming the permission, for a staff member who can only read', async () => {
    await openRefunds(REFUNDS_VIEW, { permissions: ['refunds:read'] });
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
