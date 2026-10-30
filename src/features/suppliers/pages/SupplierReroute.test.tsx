// Tests for "Reroute open orders…", run through the whole app against the feature's mock API and the orders mocks: what the
// dialog lists, which suppliers it offers, a run in which the server refuses one order after the move, and who may start it.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { mocks, suppliersState } from '../mocks';
import { detailOf, openSuppliers, supplierButton, toasts } from '../test/suppliersPage';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => mockServer.use(...mocks.handlers));

async function openReroute(user: ReturnType<typeof userEvent.setup>, label = /^Reroute 10 open orders/) {
  const detail = await detailOf('Rapid IMEI');
  await user.click(await detail.findByRole('button', { name: label }));
  const dialog = within(await screen.findByRole('dialog', { name: 'Reroute open orders from Rapid IMEI' }));
  await dialog.findByRole('table', { name: 'Open orders to move' });
  return dialog;
}

describe('the dialog', () => {
  it('lists the supplier’s open orders and offers only suppliers that are enabled and not down', async () => {
    const user = userEvent.setup();
    const data = await suppliersState();
    data.suppliers.patch(4, { health: 'down' });
    data.suppliers.patch(5, { status: 'disabled' });
    await openSuppliers('/suppliers?supplier=3');
    const dialog = await openReroute(user);

    const orders = within(dialog.getByRole('table', { name: 'Open orders to move' }));
    expect(orders.getAllByRole('row')).toHaveLength(11); // the header and 10 orders
    expect(dialog.getByText('10 orders open, oldest first.')).toBeInTheDocument();
    const target = dialog.getByLabelText('Move them to');
    expect(
      within(target)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Choose a supplier…', 'Nordic GSM', 'Gulf Server Hub', 'Bosphorus Unlock']);
  });

  it('marks a degraded supplier as a target, and asks for a target before it moves anything', async () => {
    const user = userEvent.setup();
    (await suppliersState()).suppliers.patch(6, { health: 'degraded' });
    await openSuppliers('/suppliers?supplier=3');
    const dialog = await openReroute(user);
    expect(
      within(dialog.getByLabelText('Move them to')).getByRole('option', {
        name: 'Bosphorus Unlock (degraded)',
      }),
    ).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Reroute 10 orders' }));
    expect(await dialog.findByText('Choose the supplier to move the orders to.')).toBeInTheDocument();
  });

  it('says there is nothing to move when the supplier has no open order', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/orders', ({ request }) =>
        new URL(request.url).searchParams.has('supplierId')
          ? HttpResponse.json([], { headers: { 'x-total-count': '0' } })
          : undefined,
      ),
    );
    await openSuppliers('/suppliers?supplier=3');
    const detail = await detailOf('Rapid IMEI');
    await user.click(await detail.findByRole('button', { name: /^Reroute 10 open orders/ }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Reroute open orders from Rapid IMEI' }));
    expect(await dialog.findByText('No open orders')).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Reroute 0 orders' })).toBeDisabled();
  });
});

describe('a run', () => {
  it('moves the orders one at a time, lists the one the server refused after the move, and updates the counts', async () => {
    const user = userEvent.setup();
    let dispatches = 0;
    mockServer.use(
      http.post('*/admin/orders/:id/dispatch', () => {
        dispatches += 1;
        return dispatches === 3
          ? problem(409, 'SUPPLIER_REFUSED', 'Not sent', 'Nordic GSM does not take this service.')
          : undefined;
      }),
    );
    await openSuppliers('/suppliers?supplier=3');
    const dialog = await openReroute(user);
    await user.selectOptions(dialog.getByLabelText('Move them to'), 'Nordic GSM');
    await user.click(dialog.getByRole('button', { name: 'Reroute 10 orders' }));

    expect(
      await dialog.findByText(/9 of 10 orders rerouted to Nordic GSM\. 1 was refused\./),
    ).toBeInTheDocument();
    const failed = within(dialog.getByRole('list', { name: 'Orders that were not rerouted' }));
    expect(failed.getAllByRole('listitem')).toHaveLength(1);
    expect(
      failed.getByText('Moved to Nordic GSM, but not sent: Nordic GSM does not take this service.'),
    ).toBeInTheDocument();
    expect(await toasts().findByText('9 orders rerouted to Nordic GSM')).toBeInTheDocument();
    expect(dispatches).toBe(10);

    await user.click(dialog.getByRole('button', { name: 'Done' }));
    // Every order moved (even the one that was not sent), so Rapid IMEI has none left and Nordic GSM has them.
    await waitFor(async () =>
      expect(within(await supplierButton(/^Rapid IMEI/)).getByText(/· 0 open/)).toBeInTheDocument(),
    );
    expect(within(await supplierButton(/^Nordic GSM/)).getByText(/· 27 open/)).toBeInTheDocument();
    const rapid = await detailOf('Rapid IMEI');
    expect(rapid.queryByRole('button', { name: /Reroute \d+ open order/ })).not.toBeInTheDocument();
  });

  it('is offered from the banner and the menu, and only to staff who may change orders', async () => {
    const user = userEvent.setup();
    await openSuppliers('/suppliers?supplier=3', { permissions: ['suppliers:read', 'orders:read'] });
    const detail = await detailOf('Rapid IMEI');
    const button = await detail.findByRole('button', { name: /^Reroute 10 open orders/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'You need the orders:update permission');
    await user.click(detail.getByRole('button', { name: 'More actions for Rapid IMEI' }));
    expect(screen.getByRole('menuitem', { name: 'Reroute open orders…' })).toBeDisabled();
  });
});
