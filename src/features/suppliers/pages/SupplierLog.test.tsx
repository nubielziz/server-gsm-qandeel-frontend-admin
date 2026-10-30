// Tests for the API log at the bottom of a supplier's detail, run through the whole app against the feature's mock API: the
// rows and their colours, the drawer with the request and response bodies, the link to the order, and the live refresh with
// its Pause toggle. The refresh interval is shortened so the test does not wait ten seconds.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { addCall, mocks, suppliersState } from '../mocks';
import { detailOf, openSuppliers } from '../test/suppliersPage';

vi.mock('../hooks/refresh', () => ({ LOG_REFRESH_MS: 150 }));

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => mockServer.use(...mocks.handlers));

async function logOf(name: string) {
  const detail = await detailOf(name);
  return { detail, table: within(await detail.findByRole('table', { name: 'Recent API calls' })) };
}

describe('the rows', () => {
  it('lists the newest calls first with their action, status, latency, order and message', async () => {
    await openSuppliers();
    const { table } = await logOf('Nordic GSM');
    const rows = table.getAllByRole('row');
    expect(rows).toHaveLength(26); // the header and the newest 25
    const first = within(rows[1]);
    expect(first.getByText('placeimeiorder')).toBeInTheDocument();
    expect(first.getByText('200')).toHaveClass('text-good-fg');
    expect(first.getByText(/^\d+ ms$/)).toBeInTheDocument();
    expect(first.getByText('OK')).toBeInTheDocument();
    expect(first.getByRole('button', { name: /^#\d+$/ })).toBeInTheDocument();
    // A balance check belongs to no order.
    const balance = within(table.getAllByText('accountinfo')[0].closest('tr') as HTMLElement);
    expect(balance.getByText('—')).toBeInTheDocument();
  });

  it('colours a failed call, a rate-limited call and a slow one', async () => {
    await openSuppliers('/suppliers?supplier=3');
    const { table } = await logOf('Rapid IMEI');
    const timeout = within(table.getAllByText('504')[0].closest('tr') as HTMLElement);
    expect(timeout.getByText('504')).toHaveClass('text-crit-fg');
    expect(timeout.getByText('Gateway timeout')).toBeInTheDocument();
    expect(timeout.getByText(/^\d+(\.\d)? s$/)).toHaveClass('text-crit-fg');
    expect(within(table.getAllByText('429')[0].closest('tr') as HTMLElement).getByText('429')).toHaveClass(
      'text-warn-fg',
    );
  });

  it('says there are no calls yet, and shows the server’s error with Retry', async () => {
    const user = userEvent.setup();
    let failing = false;
    mockServer.use(
      http.get('*/admin/supplier-api-logs', () =>
        failing
          ? problem(403, 'FORBIDDEN', 'No permission', 'You cannot read the API log.')
          : HttpResponse.json([], { headers: { 'x-total-count': '0' } }),
      ),
    );
    await openSuppliers();
    const detail = await detailOf('Nordic GSM');
    expect(await detail.findByText('No calls yet')).toBeInTheDocument();
    failing = true;
    await waitFor(() => expect(detail.getByText('Could not load the API log')).toBeInTheDocument());
    expect(detail.getByText('You cannot read the API log.')).toBeInTheDocument();
    failing = false;
    await user.click(detail.getByRole('button', { name: 'Retry' }));
    expect(await detail.findByText('No calls yet')).toBeInTheDocument();
  });
});

describe('the drawer', () => {
  it('opens a call with its request and response as JSON, and the secrets stay masked', async () => {
    const user = userEvent.setup();
    await openSuppliers();
    const { table } = await logOf('Nordic GSM');
    await user.click(table.getAllByRole('button', { name: /^Details of the placeimeiorder call at/ })[0]);

    const drawer = within(await screen.findByRole('dialog', { name: 'placeimeiorder' }));
    const request = await drawer.findByLabelText('Call request');
    expect(request.textContent).toContain('"action": "placeimeiorder"');
    expect(request.textContent).toContain('"apiaccesskey": "••••••••"');
    expect(drawer.getByLabelText('Call response').textContent).toContain('"SUCCESS"');
    expect(drawer.getByText('200, OK')).toBeInTheDocument();
    expect(drawer.getByRole('button', { name: 'Copy request' })).toBeInTheDocument();

    await user.click(drawer.getByRole('button', { name: 'Close details' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'placeimeiorder' })).not.toBeInTheDocument(),
    );
  });

  it('opens the same call from a click on the row', async () => {
    const user = userEvent.setup();
    await openSuppliers();
    const { table } = await logOf('Nordic GSM');
    await user.click(table.getAllByText('placeimeiorder')[0]);
    expect(await screen.findByRole('dialog', { name: 'placeimeiorder' })).toBeInTheDocument();
  });

  it('shows the server’s error when the call cannot be read', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/supplier-api-logs/:id', () =>
        problem(404, 'NOT_FOUND', 'Call not found', 'The log was cleaned up.'),
      ),
    );
    await openSuppliers();
    const { table } = await logOf('Nordic GSM');
    await user.click(table.getAllByRole('button', { name: /^Details of the/ })[0]);
    const drawer = within(await screen.findByRole('dialog', { name: 'API call' }));
    expect(await drawer.findByText('Could not load the call')).toBeInTheDocument();
    expect(drawer.getByText('The log was cleaned up.')).toBeInTheDocument();
  });

  it('opens the order of a call in the order drawer, and closes the call first', async () => {
    const user = userEvent.setup();
    const app = await openSuppliers();
    const { table } = await logOf('Nordic GSM');
    const link = table.getAllByRole('button', { name: /^#\d+$/ })[0];
    const orderId = link.textContent?.slice(1);
    await user.click(link);
    expect(app.location()).toContain(`order=${orderId}`);
    expect(await screen.findByRole('dialog', { name: new RegExp(`${orderId}$`) })).toBeInTheDocument();
  });
});

describe('live refresh', () => {
  it('shows a new call by itself, stops while paused and carries on when resumed', async () => {
    const user = userEvent.setup();
    await openSuppliers();
    const { detail, table } = await logOf('Nordic GSM');
    const data = await suppliersState();
    expect(detail.getByText('Live. The newest calls appear here every 10 seconds.')).toBeInTheDocument();

    addCall(data, {
      supplierId: 1,
      action: 'getimeiorder',
      code: 429,
      ms: 120,
      message: 'Rate limited, retry after 5s',
    });
    expect(await table.findByText('Rate limited, retry after 5s')).toBeInTheDocument();

    const pause = detail.getByRole('button', { name: 'Pause live updates' });
    expect(pause).toHaveAttribute('aria-pressed', 'false');
    await user.click(pause);
    expect(detail.getByRole('button', { name: 'Resume live updates' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(detail.getByText('Paused. New calls are not shown.')).toBeInTheDocument();

    // Let a refresh that was already on its way finish, so it cannot pick up the call added next.
    await new Promise((resolve) => setTimeout(resolve, 300));
    addCall(data, {
      supplierId: 1,
      action: 'placeimeiorder',
      code: 503,
      ms: 9000,
      message: 'Service unavailable',
    });
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(table.queryByText('Service unavailable')).not.toBeInTheDocument();

    await user.click(detail.getByRole('button', { name: 'Resume live updates' }));
    expect(await table.findByText('Service unavailable')).toBeInTheDocument();
    expect(detail.getByText('Live. The newest calls appear here every 10 seconds.')).toBeInTheDocument();
  });
});
