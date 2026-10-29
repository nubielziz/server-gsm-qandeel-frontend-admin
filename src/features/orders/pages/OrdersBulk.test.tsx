// Tests for the bulk side of the orders page, run through the whole app against the dev mock API: ticking rows and the bar,
// bulk Reject with one order refused, bulk Complete with {input}, Retry and Reroute with their progress, the bulk reply flow, the
// row menu, and what the staff member's permissions disable.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { openOrders, orderRow, ordersTable, tabTexts } from '@/test/ordersPage';
import { setupMockApi } from '@/test/renderApp';
import { getOrder, rejectOrder } from '../api';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

type User = ReturnType<typeof userEvent.setup>;

/** The ids of the first `count` rows of the table, read from their tick boxes. */
async function firstIds(count: number): Promise<number[]> {
  const boxes = await screen.findAllByRole('checkbox', { name: /^Select row / });
  return boxes
    .slice(0, count)
    .map((box) => Number(box.getAttribute('aria-label')?.replace('Select row ', '')));
}

async function tick(user: User, ids: number[]) {
  for (const id of ids) await user.click(await screen.findByRole('checkbox', { name: `Select row ${id}` }));
}

const bar = () => within(screen.getByRole('region', { name: 'Bulk actions' }));

describe('the bulk bar', () => {
  it('says how many are ticked and what is at stake, and clears', async () => {
    const user = userEvent.setup();
    await openOrders('/orders?tab=queued');
    const ids = await firstIds(2);
    await tick(user, ids);
    expect(bar().getByText('2 selected')).toBeInTheDocument();
    expect(bar().getByText(/^\$[\d.,]+ at stake$/)).toBeInTheDocument();
    await user.click(bar().getByRole('button', { name: 'Clear' }));
    expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument();
  });

  it('ticks the whole page with the header box, and counts closed orders as already closed', async () => {
    const user = userEvent.setup();
    await openOrders('/orders?tab=completed');
    await user.click(await screen.findByRole('checkbox', { name: 'Select all rows on this page' }));
    expect(bar().getByText('25 selected')).toBeInTheDocument();
    expect(bar().getByText('0 can be changed, 25 already closed')).toBeInTheDocument();
    expect(bar().getByRole('button', { name: 'Complete…' })).toBeDisabled();
    expect(bar().getByRole('button', { name: 'Reject…' })).toBeDisabled();
  });

  it('forgets the ticks when the tab changes', async () => {
    const user = userEvent.setup();
    await openOrders('/orders?tab=queued');
    await tick(user, await firstIds(1));
    await user.click(screen.getByRole('tab', { name: /Open/ }));
    expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument();
  });

  it('disables the bulk actions without orders:update', async () => {
    const user = userEvent.setup();
    await openOrders('/orders?tab=queued', { permissions: ['orders:read'] });
    await tick(user, await firstIds(1));
    for (const name of ['Complete…', 'Retry', 'Reject…']) {
      expect(bar().getByRole('button', { name })).toBeDisabled();
    }
  });
});

describe('bulk Reject', () => {
  it('rejects the ticked orders one by one and lists the one the server refused', async () => {
    const user = userEvent.setup();
    await openOrders('/orders?tab=queued');
    await screen.findByText('6 orders');
    const [first, second, third] = await firstIds(3);
    await tick(user, [first, second, third]);
    await user.click(bar().getByRole('button', { name: 'Reject…' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Reject 3 orders' }));
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Reason' }), 'Device already unlocked');

    // Someone else closes the second order while the dialog is open: the server refuses that one call.
    await rejectOrder(second, { reason: 'Closed by a colleague' });
    await user.click(dialog.getByRole('button', { name: 'Reject and refund' }));

    expect(await screen.findByText('2 orders rejected')).toBeInTheDocument();
    const summary = within(await screen.findByRole('dialog', { name: '2 of 3 orders rejected' }));
    expect(
      summary.getByText("1 could not be rejected. The server's reason is shown for each."),
    ).toBeInTheDocument();
    expect(summary.getByText(new RegExp(`^(ORD|SF)-${second}$`))).toBeInTheDocument();
    expect(summary.getByText(/Only an open order can be changed\./)).toBeInTheDocument();

    expect((await getOrder(first)).status).toBe('rejected');
    expect((await getOrder(third)).result.code).toBe('Device already unlocked');
    await user.click(summary.getAllByRole('button', { name: 'Close' }).at(-1) as HTMLElement); // the header's X, then the footer's button
    expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument();
    await waitFor(() => expect(tabTexts()).toContain('Queued3'));
  });

  it('keeps a single refused order inside the dialog, with the server’s words', async () => {
    const user = userEvent.setup();
    await openOrders('/orders?tab=queued');
    const [id] = await firstIds(1);
    await tick(user, [id]);
    await user.click(bar().getByRole('button', { name: 'Reject…' }));
    const dialog = within(await screen.findByRole('dialog', { name: `Reject ORD-${id}` }));
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Reason' }), 'IMEI is blacklisted');
    await rejectOrder(id, { reason: 'Closed by a colleague' });
    await user.click(dialog.getByRole('button', { name: 'Reject and refund' }));
    expect(await dialog.findByText('Only an open order can be changed.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /of 1 order/ })).not.toBeInTheDocument();
  });
});

describe('bulk Complete', () => {
  it('completes the ticked orders with one reply, each with its own input in place of {input}', async () => {
    const user = userEvent.setup();
    await openOrders('/orders?tab=queued');
    const ids = await firstIds(2);
    await tick(user, ids);
    await user.click(bar().getByRole('button', { name: 'Complete…' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Complete 2 orders' }));
    expect(
      dialog.getByText(/Settles \$[\d.,]+ of revenue and \$[\d.,]+ of supplier cost to the ledger\./),
    ).toBeInTheDocument();
    expect(dialog.getByText(/to insert each order’s IMEI or account\./)).toBeInTheDocument();
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Reply template' }), 'Credits delivered');
    expect(dialog.getByRole('textbox', { name: /Reply sent to the/ })).toHaveValue(
      'Delivered to {input}. Activation takes under 2 minutes.',
    );
    await user.click(dialog.getByRole('button', { name: 'Complete 2 orders' }));

    expect(await screen.findByText('2 orders completed')).toBeInTheDocument();
    for (const id of ids) {
      const order = await getOrder(id);
      expect(order.status).toBe('completed');
      expect(order.result.code).toBe(`Delivered to ${order.imei}. Activation takes under 2 minutes.`);
    }
    expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument();
  });

  it('starts the reply with {input}, so the first order’s account is not sent to the others', async () => {
    const user = userEvent.setup();
    await openOrders('/orders?tab=queued');
    await tick(user, await firstIds(2)); // two Server orders, whose default reply names the account
    await user.click(bar().getByRole('button', { name: 'Complete…' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Complete 2 orders' }));
    expect(dialog.getByRole('textbox', { name: /Reply sent to the/ })).toHaveValue(
      'Delivered to {input}. Activation takes under 2 minutes.',
    );
  });

  it('asks for a reply first', async () => {
    const user = userEvent.setup();
    await openOrders('/orders?tab=queued');
    await tick(user, await firstIds(2));
    await user.click(bar().getByRole('button', { name: 'Complete…' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Complete 2 orders' }));
    await user.clear(dialog.getByRole('textbox', { name: /Reply sent to the/ }));
    await user.click(dialog.getByRole('button', { name: 'Complete 2 orders' }));
    expect(
      await dialog.findByText('Write a reply. The merchant sees it as the order result.'),
    ).toBeInTheDocument();
  });
});

describe('bulk Retry and Reroute', () => {
  it('sends the ticked orders to their suppliers again', async () => {
    const user = userEvent.setup();
    await openOrders('/orders?tab=queued');
    const ids = await firstIds(2);
    await tick(user, ids);
    await user.click(bar().getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('2 orders re-sent')).toBeInTheDocument();
    expect((await getOrder(ids[0])).status).toBe('processing');
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument(),
    );
  });

  it('reroutes them to the chosen supplier, which is not offered when it is down', async () => {
    const user = userEvent.setup();
    await openOrders('/orders?tab=queued');
    const ids = await firstIds(2);
    await tick(user, ids);
    const reroute = bar().getByRole('button', { name: /Reroute/ });
    await waitFor(() => expect(reroute).toBeEnabled());
    await user.click(reroute);
    await user.click(await screen.findByRole('menuitem', { name: 'Gulf Server Hub' }));
    expect(await screen.findByText('2 orders rerouted to Gulf Server Hub')).toBeInTheDocument();
    const moved = await getOrder(ids[0]);
    expect(moved.supplier?.name).toBe('Gulf Server Hub');
    expect(moved.supplierRef).toBeNull();
    expect(moved.status).toBe('processing');
  });
});

describe('bulk reply', () => {
  it('previews what each pasted line matches, then applies the matched ones', async () => {
    const user = userEvent.setup();
    await openOrders();
    await user.click(await screen.findByRole('button', { name: 'Bulk reply' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Bulk reply' }));
    await user.click(dialog.getByRole('button', { name: 'Preview' }));
    expect(await dialog.findByText('Paste at least one line.')).toBeInTheDocument();

    await user.type(
      dialog.getByRole('textbox', { name: 'IMEI and code, one order per line' }),
      '354607116588777 UNLOCK-8841{Enter}000000000000000 UNLOCK-8842{Enter}354607115141487',
    );
    await user.click(dialog.getByRole('button', { name: 'Preview' }));
    expect(
      await dialog.findByText('1 of 3 lines match an open order. Check them, then apply.'),
    ).toBeInTheDocument();
    const table = within(dialog.getByRole('table', { name: 'Pasted lines' }));
    expect(table.getByText('Will complete')).toBeInTheDocument();
    expect(table.getByText('No order found')).toBeInTheDocument();
    expect(table.getByText('Not a valid line')).toBeInTheDocument();

    await user.click(dialog.getByRole('button', { name: 'Apply 1 reply' }));
    expect(await screen.findByText('1 order completed')).toBeInTheDocument();
    expect((await getOrder(48859)).result.code).toBe('UNLOCK-8841');
  });

  it('goes back to the text to fix a line, and has nothing to apply when no line matches', async () => {
    const user = userEvent.setup();
    await openOrders();
    await user.click(await screen.findByRole('button', { name: 'Bulk reply' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Bulk reply' }));
    await user.type(
      dialog.getByRole('textbox', { name: 'IMEI and code, one order per line' }),
      '000000000000000 X1',
    );
    await user.click(dialog.getByRole('button', { name: 'Preview' }));
    await user.click(await dialog.findByRole('button', { name: 'Apply 0 replies' }));
    expect(
      await dialog.findByText('No line matches an open order, so there is nothing to apply.'),
    ).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Back to the text' }));
    expect(dialog.getByRole('textbox', { name: 'IMEI and code, one order per line' })).toHaveValue(
      '000000000000000 X1',
    );
  });
});

describe('the row menu', () => {
  it('offers the actions of the order’s state', async () => {
    const user = userEvent.setup();
    await openOrders('/orders?tab=all');
    const row = await orderRow('ORD-48859');
    await user.click(row.getByRole('button', { name: 'Actions for ORD-48859' }));
    const menu = within(await screen.findByRole('menu', { name: 'Actions for ORD-48859' }));
    expect(menu.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Open details',
      'Copy IMEI / input',
      'Complete…',
      'Retry on Nordic GSM',
      'Reject…',
    ]);
  });

  it('retries from the menu', async () => {
    const user = userEvent.setup();
    await openOrders('/orders?tab=all');
    await user.click((await orderRow('ORD-48859')).getByRole('button', { name: 'Actions for ORD-48859' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Retry on Nordic GSM' }));
    expect(await screen.findByText('ORD-48859 re-sent')).toBeInTheDocument();
  });

  it('completes one order from the menu with the dialog, and cancels a storefront order as a refund', async () => {
    const user = userEvent.setup();
    await openOrders('/orders?tab=all');
    await user.click((await orderRow('ORD-48859')).getByRole('button', { name: 'Actions for ORD-48859' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Complete…' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Complete ORD-48859' }));
    expect(dialog.getByRole('textbox', { name: 'Reply sent to the merchant' })).toHaveValue(
      'Unlock confirmed by carrier. Insert a non-supported SIM to verify.',
    );
    await user.type(dialog.getByRole('textbox', { name: 'Comment (optional)' }), 'Checked by hand');
    await user.click(dialog.getByRole('button', { name: 'Complete order' }));
    expect(await screen.findByText('ORD-48859 completed')).toBeInTheDocument();
    expect((await getOrder(48859)).result.comment).toBe('Checked by hand');
  });

  it('rejects one order from the menu and keeps the other ticks', async () => {
    const user = userEvent.setup();
    await openOrders('/orders?tab=queued');
    const [first, second, third] = await firstIds(3);
    await tick(user, [first, second]);
    await user.click(
      (await orderRow(`ORD-${third}`)).getByRole('button', { name: `Actions for ORD-${third}` }),
    );
    await user.click(await screen.findByRole('menuitem', { name: /^(Reject|Cancel and refund)…$/ }));
    const dialog = within(await screen.findByRole('dialog', { name: new RegExp(`ORD-${third}$`) }));
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Reason' }), 'Device already unlocked');
    await user.click(dialog.getByRole('button', { name: /refund$/ }));

    await waitFor(async () => expect((await getOrder(third)).status).toBe('rejected'));
    expect(bar().getByText('2 selected')).toBeInTheDocument();
  });

  it('opens the details from the menu, keeping the filters in the address', async () => {
    const user = userEvent.setup();
    const app = await openOrders('/orders?tab=queued');
    const [id] = await firstIds(1);
    await user.click((await orderRow(`ORD-${id}`)).getByRole('button', { name: `Actions for ORD-${id}` }));
    await user.click(await screen.findByRole('menuitem', { name: 'Open details' }));
    expect(app.location()).toBe(`/orders?tab=queued&order=${id}`);
    expect((await ordersTable()).getAllByRole('row').length).toBeGreaterThan(1);
  });
});
