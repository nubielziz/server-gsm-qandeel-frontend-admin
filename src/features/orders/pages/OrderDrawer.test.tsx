// Tests for the order drawer, run through the whole app against the dev mock API: what each state shows and offers, the actions
// and their dialogs, the timeline and notes, the files and the ledger trail, and what the staff member's permissions hide.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { openOrders } from '@/test/ordersPage';
import { setupMockApi } from '@/test/renderApp';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

// Orders of the mock seed (see src/mocks/orders.ts and the API tests).
const MANUAL = 48842;
const TIMED_OUT = 48799;
const NORMAL = 48859;
const DELIVERED = 48101;
const FILE_RESULT = 48100;
const VERIFYING = 48841;
const HELD = 20490;
const STOREFRONT_DONE = 20400;
const REJECTED = 48119;

/** Opens the drawer of one order by its address and waits until the order itself has loaded. */
async function openDrawer(id: number, label: string, options: { permissions?: string[] } = {}) {
  const app = await openOrders(`/orders?order=${id}`, options);
  const drawer = await screen.findByRole('dialog', { name: label });
  await within(drawer).findByRole('heading', { name: 'Timeline' });
  return { app, drawer: within(drawer) };
}

const status = (drawer: ReturnType<typeof within>, word: string) =>
  drawer.getByText(word, { selector: '.badge span' });

describe('what the drawer shows', () => {
  it('shows a manual order’s banner, facts and the buttons for that state: Accept first, no Retry', async () => {
    const { drawer } = await openDrawer(MANUAL, 'ORD-48842');
    expect(drawer.getByText('Stopped for review')).toBeInTheDocument();
    expect(drawer.getAllByText('Manual service: operator dispatch required').length).toBeGreaterThan(0);
    expect(drawer.getByText('Not sent yet')).toBeInTheDocument();
    expect(drawer.getByRole('button', { name: 'Accept' })).toHaveClass('btn-primary');
    expect(drawer.getByRole('button', { name: 'Complete' })).not.toHaveClass('btn-primary');
    expect(drawer.getByRole('button', { name: 'Reject…' })).toBeInTheDocument();
    expect(drawer.queryByRole('button', { name: /Retry or reroute/ })).not.toBeInTheDocument();
  });

  it('makes Fetch result the black button after a supplier timeout, with the warning that the supplier may have run it', async () => {
    const { drawer } = await openDrawer(TIMED_OUT, 'ORD-48799');
    // The reason shows in the banner and again in the timeline's "review" line.
    expect(drawer.getAllByText('Supplier timed out after 3 attempts')).not.toHaveLength(0);
    expect(drawer.getByText(/The supplier may already have this order/)).toBeInTheDocument();
    expect(drawer.getByRole('button', { name: 'Fetch result' })).toHaveClass('btn-primary');
    expect(drawer.getByRole('button', { name: 'Complete' })).not.toHaveClass('btn-primary');
    expect(drawer.getByRole('button', { name: /Retry or reroute/ })).toBeInTheDocument();
    expect(drawer.getAllByText(/RI-499783/).length).toBeGreaterThan(0);
  });

  it('shows a held storefront order’s risk note and a link to the Risk queue instead of order actions', async () => {
    const { drawer } = await openDrawer(HELD, 'SF-20490');
    expect(drawer.getByText('Paid, held by the risk engine')).toBeInTheDocument();
    expect(drawer.getByRole('link', { name: /Open the Risk queue/ })).toHaveAttribute(
      'href',
      '/risk?tab=queue',
    );
    expect(drawer.queryByRole('button', { name: 'Complete' })).not.toBeInTheDocument();
    expect(drawer.queryByRole('button', { name: /Reject|Cancel and refund/ })).not.toBeInTheDocument();
    expect(drawer.getByText('Clock starts when it is approved')).toBeInTheDocument();
  });

  it('shows a delivered merchant order with its result, Reopen and Refund', async () => {
    const { drawer } = await openDrawer(DELIVERED, 'ORD-48101');
    expect(status(drawer, 'Completed')).toBeInTheDocument();
    expect(drawer.getByText('Result sent to merchant')).toBeInTheDocument();
    expect(
      drawer.getByText(/Delivered and paid\. A refund after delivery loses the supplier cost\./),
    ).toBeInTheDocument();
    expect(drawer.getByRole('button', { name: 'Reopen…' })).toBeEnabled();
    expect(drawer.getByRole('button', { name: 'Refund…' })).toBeEnabled();
  });

  it('sends a delivered storefront order to the Refunds page', async () => {
    const { drawer } = await openDrawer(STOREFRONT_DONE, 'SF-20400');
    expect(drawer.getByText('Storefront')).toBeInTheDocument();
    expect(drawer.getByText('Result sent to customer')).toBeInTheDocument();
    expect(drawer.getByText('Storefront orders are refunded from Refunds.')).toBeInTheDocument();
    expect(drawer.getByRole('link', { name: /Open Refunds/ })).toHaveAttribute('href', '/refunds');
    expect(drawer.queryByRole('button', { name: 'Refund…' })).not.toBeInTheDocument();
  });

  it('asks for a verification decision on a delivered order that waits for one', async () => {
    const { drawer } = await openDrawer(VERIFYING, 'ORD-48841');
    expect(drawer.getByText(/Accept it to keep the charge, or refund the buyer/)).toBeInTheDocument();
    expect(drawer.getByRole('button', { name: 'Accept result' })).toHaveClass('btn-primary');
    expect(drawer.getByRole('button', { name: 'Refund…' })).toBeInTheDocument();
  });

  it('shows why a rejected order was rejected, and offers nothing', async () => {
    const { drawer } = await openDrawer(REJECTED, 'ORD-48119');
    expect(status(drawer, 'Rejected')).toBeInTheDocument();
    expect(await drawer.findAllByText('IMEI is blacklisted')).not.toHaveLength(0);
    expect(drawer.getByText('This order is closed.')).toBeInTheDocument();
  });

  it('breaks the money down for a merchant order and for a storefront customer', async () => {
    const { drawer } = await openDrawer(NORMAL, 'ORD-48859');
    expect(drawer.getByText('Charged to merchant')).toBeInTheDocument();
    expect(drawer.getByText('Supplier cost')).toBeInTheDocument();
    expect(drawer.getByText('Held in client_hold')).toBeInTheDocument();
    expect(drawer.getByText('Base price')).toBeInTheDocument();
  });

  it('shows what a storefront customer paid, the VAT and the price before it', async () => {
    const { drawer } = await openDrawer(STOREFRONT_DONE, 'SF-20400');
    expect(drawer.getByText('Customer paid')).toBeInTheDocument();
    expect(drawer.getByText(/VAT 20%/)).toBeInTheDocument();
    expect(drawer.getByText('Price before VAT')).toBeInTheDocument();
    expect(drawer.getByText('Storefront price')).toBeInTheDocument();
  });

  it('explains the price from the order’s own snapshot', async () => {
    const user = userEvent.setup();
    const { drawer } = await openDrawer(NORMAL, 'ORD-48859');
    await user.click(drawer.getByRole('button', { name: 'How was this priced?' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'How ORD-48859 was priced' }));
    expect(dialog.getByText('Client override')).toBeInTheDocument();
    expect(dialog.getByText('Group service price')).toBeInTheDocument();
    expect(dialog.getByText('Applied')).toBeInTheDocument();
    expect(dialog.getAllByText('Not set')).toHaveLength(2);
    expect(dialog.getByText(/Floor \$10\.39/)).toBeInTheDocument();
  });

  it('shows a deep link to an order that does not exist as an error with Retry', async () => {
    await openOrders('/orders?order=1');
    expect(await screen.findByText('Could not load this order')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Retry' }).length).toBeGreaterThan(0);
  });
});

describe('closing', () => {
  it('removes the order from the address when the drawer closes', async () => {
    const user = userEvent.setup();
    const { app, drawer } = await openDrawer(NORMAL, 'ORD-48859');
    expect(app.location()).toBe('/orders?order=48859');
    await user.click(drawer.getByRole('button', { name: 'Close details' }));
    expect(app.location()).toBe('/orders');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'ORD-48859' })).not.toBeInTheDocument());
  });

  it('opens from a row click and keeps the filters in the address', async () => {
    const user = userEvent.setup();
    const app = await openOrders('/orders?tab=queued');
    await user.click(await screen.findByRole('button', { name: 'ORD-48857' }));
    expect(app.location()).toBe('/orders?tab=queued&order=48857');
    expect(await screen.findByRole('dialog', { name: 'ORD-48857' })).toBeInTheDocument();
  });
});

describe('actions', () => {
  it('accepts a manual order: it moves to Processing and the buttons follow', async () => {
    const user = userEvent.setup();
    const { drawer } = await openDrawer(MANUAL, 'ORD-48842');
    await user.click(drawer.getByRole('button', { name: 'Accept' }));
    expect(await screen.findByText('ORD-48842 accepted')).toBeInTheDocument();
    await waitFor(() => expect(status(drawer, 'Processing')).toBeInTheDocument());
    expect(drawer.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
    expect(await drawer.findByText('Accepted by Rami K., moved to Processing')).toBeInTheDocument();
  });

  it('completes an order with the reply in the box, then shows the result and opens the ledger from the toast', async () => {
    const user = userEvent.setup();
    const { drawer } = await openDrawer(NORMAL, 'ORD-48859');
    const reply = drawer.getByRole('textbox', { name: 'Reply to send when completing' });
    expect(reply).toHaveValue('Unlock confirmed by carrier. Insert a non-supported SIM to verify.');
    await user.clear(reply);
    await user.type(reply, 'Unlocked. Restart the phone.');
    await user.click(drawer.getByRole('button', { name: 'Complete' }));

    expect(await screen.findByText('ORD-48859 completed')).toBeInTheDocument();
    expect(screen.getByText('$12.49 settled to revenue.')).toBeInTheDocument();
    await waitFor(() => expect(status(drawer, 'Completed')).toBeInTheDocument());
    expect(drawer.getByText('Unlocked. Restart the phone.')).toBeInTheDocument();
    expect(drawer.queryByRole('textbox', { name: 'Reply to send when completing' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'View ledger' }));
    const ledger = within(await screen.findByRole('dialog', { name: 'Ledger entries for ORD-48859' }));
    expect(await ledger.findByText('Order settled')).toBeInTheDocument();
    // The hold (when the order was placed) and the settlement are both in the trail.
    expect(ledger.getByText('Order hold')).toBeInTheDocument();
    expect(ledger.getAllByText('client_hold')).toHaveLength(2);
    expect(ledger.getByText('revenue')).toBeInTheDocument();
    expect(ledger.getAllByText('Total')).toHaveLength(2);
  });

  it('will not complete with an empty reply', async () => {
    const user = userEvent.setup();
    const { drawer } = await openDrawer(NORMAL, 'ORD-48859');
    await user.clear(drawer.getByRole('textbox', { name: 'Reply to send when completing' }));
    await user.click(drawer.getByRole('button', { name: 'Complete' }));
    expect(await screen.findByText('Write a reply first')).toBeInTheDocument();
    expect(drawer.getByRole('textbox', { name: 'Reply to send when completing' })).toHaveFocus();
    expect(status(drawer, 'Processing')).toBeInTheDocument();
  });

  it('rejects with a reason from the list, after asking for one', async () => {
    const user = userEvent.setup();
    const { drawer } = await openDrawer(NORMAL, 'ORD-48859');
    await user.click(drawer.getByRole('button', { name: 'Reject…' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Reject ORD-48859' }));
    expect(
      dialog.getByText('The merchant is refunded $12.49 straight away and sees the reason.'),
    ).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Reject and refund' }));
    expect(
      await dialog.findByText('Choose a reason. The merchant sees it with the refund.'),
    ).toBeInTheDocument();

    await user.selectOptions(dialog.getByRole('combobox', { name: 'Reason' }), 'IMEI is blacklisted');
    await user.click(dialog.getByRole('button', { name: 'Reject and refund' }));
    expect(await screen.findByText('1 order rejected')).toBeInTheDocument();
    expect(screen.getByText('$12.49 refunded to wallets.')).toBeInTheDocument();
    await waitFor(() => expect(status(drawer, 'Rejected')).toBeInTheDocument());
  });

  it('rejects with a reason of its own under "Other…", and asks for the text', async () => {
    const user = userEvent.setup();
    const { drawer } = await openDrawer(NORMAL, 'ORD-48859');
    await user.click(drawer.getByRole('button', { name: 'Reject…' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Reject ORD-48859' }));
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Reason' }), 'Other…');
    await user.click(dialog.getByRole('button', { name: 'Reject and refund' }));
    expect(await dialog.findByText('Add the reason the merchant should see.')).toBeInTheDocument();
    await user.type(
      dialog.getByRole('textbox', { name: 'Reason shown to the buyer' }),
      'Supplier cannot do this model',
    );
    await user.click(dialog.getByRole('button', { name: 'Reject and refund' }));
    expect(await screen.findByText('1 order rejected')).toBeInTheDocument();
    expect(await drawer.findAllByText('Supplier cannot do this model')).not.toHaveLength(0);
  });

  it('shows the server’s refusal inside the reject dialog when the order closed in the meantime', async () => {
    const user = userEvent.setup();
    const { drawer } = await openDrawer(NORMAL, 'ORD-48859');
    const { rejectOrder } = await import('../api');
    await rejectOrder(NORMAL, { reason: 'Rejected by someone else' });
    await user.click(drawer.getByRole('button', { name: 'Reject…' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Reject ORD-48859' }));
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Reason' }), 'IMEI is blacklisted');
    await user.click(dialog.getByRole('button', { name: 'Reject and refund' }));
    expect(await dialog.findByText('Only an open order can be changed.')).toBeInTheDocument();
  });

  it('asks the supplier for the result, and reroutes to another supplier', async () => {
    const user = userEvent.setup();
    const { drawer } = await openDrawer(TIMED_OUT, 'ORD-48799');
    await user.click(drawer.getByRole('button', { name: 'Fetch result' }));
    expect(await screen.findByText(/^Asked .+ for the result$/)).toBeInTheDocument();

    await user.click(drawer.getByRole('button', { name: /Retry or reroute/ }));
    const menu = within(await screen.findByRole('menu', { name: 'Retry or reroute' }));
    expect(menu.getByRole('menuitem', { name: /^Retry on / })).toBeInTheDocument();
    await user.click(await menu.findByRole('menuitem', { name: 'Reroute to Nordic GSM' }));
    expect(await screen.findByText('ORD-48799 rerouted to Nordic GSM')).toBeInTheDocument();
    await waitFor(() => expect(status(drawer, 'Processing')).toBeInTheDocument());
    await waitFor(() => expect(drawer.getByText('Nordic GSM')).toBeInTheDocument());
  });

  it('sends the order to its supplier again with Retry', async () => {
    const user = userEvent.setup();
    const { drawer } = await openDrawer(TIMED_OUT, 'ORD-48799');
    await user.click(drawer.getByRole('button', { name: /Retry or reroute/ }));
    await user.click(await screen.findByRole('menuitem', { name: /^Retry on / }));
    expect(await screen.findByText('ORD-48799 re-sent')).toBeInTheDocument();
    await waitFor(() => expect(status(drawer, 'Processing')).toBeInTheDocument());
  });

  it('reopens a delivered order after a confirmation, and Complete comes back', async () => {
    const user = userEvent.setup();
    const { drawer } = await openDrawer(DELIVERED, 'ORD-48101');
    await user.click(drawer.getByRole('button', { name: 'Reopen…' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Reopen ORD-48101?' }));
    await user.type(dialog.getByRole('textbox', { name: 'Reason (optional)' }), 'Code did not work');
    await user.click(dialog.getByRole('button', { name: 'Reopen order' }));
    expect(await screen.findByText('ORD-48101 reopened')).toBeInTheDocument();
    await waitFor(() => expect(status(drawer, 'Processing')).toBeInTheDocument());
    expect(drawer.getByRole('button', { name: 'Complete' })).toBeInTheDocument();
  });

  it('refunds a delivered merchant order, after asking for a reason and warning about the supplier cost', async () => {
    const user = userEvent.setup();
    const { drawer } = await openDrawer(DELIVERED, 'ORD-48101');
    await user.click(drawer.getByRole('button', { name: 'Refund…' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Refund ORD-48101' }));
    expect(
      dialog.getByText(
        /This order was delivered\. Refunding returns .* but not the .* paid to the supplier\./,
      ),
    ).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Refund' }));
    expect(await dialog.findByText('Add a short reason.')).toBeInTheDocument();
    await user.type(dialog.getByRole('textbox', { name: 'Reason' }), 'Goodwill');
    await user.click(dialog.getByRole('button', { name: 'Refund' }));
    expect(await screen.findByText(/refunded$/)).toBeInTheDocument();
    await waitFor(() => expect(status(drawer, 'Rejected')).toBeInTheDocument());
  });

  it('accepts the result of a verification request', async () => {
    const user = userEvent.setup();
    const { drawer } = await openDrawer(VERIFYING, 'ORD-48841');
    await user.click(drawer.getByRole('button', { name: 'Accept result' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Accept the result of ORD-48841?' }));
    await user.click(dialog.getByRole('button', { name: 'Accept result' }));
    expect(await screen.findByText('ORD-48841: result accepted')).toBeInTheDocument();
    await waitFor(() =>
      expect(drawer.queryByRole('button', { name: 'Accept result' })).not.toBeInTheDocument(),
    );
    expect(status(drawer, 'Completed')).toBeInTheDocument();
  });

  it('refunds a verification request', async () => {
    const user = userEvent.setup();
    const { drawer } = await openDrawer(VERIFYING, 'ORD-48841');
    await user.click(drawer.getByRole('button', { name: 'Refund…' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Refund ORD-48841?' }));
    await user.click(dialog.getByRole('button', { name: 'Refund' }));
    expect(await screen.findByText('ORD-48841 refunded')).toBeInTheDocument();
    await waitFor(() => expect(status(drawer, 'Rejected')).toBeInTheDocument());
  });
});

describe('timeline and notes', () => {
  it('lists the events oldest first with who did each one', async () => {
    const { drawer } = await openDrawer(DELIVERED, 'ORD-48101');
    const items = drawer.getAllByRole('listitem');
    expect(items.length).toBeGreaterThanOrEqual(6);
    expect(items[0]).toHaveTextContent(/Order received via/);
    expect(drawer.getByText(/Completed/, { selector: 'span.text-sm' })).toBeInTheDocument();
  });

  it('adds an internal note to the timeline, and asks for text first', async () => {
    const user = userEvent.setup();
    const { drawer } = await openDrawer(NORMAL, 'ORD-48859');
    await user.click(drawer.getByRole('button', { name: 'Add note' }));
    expect(await drawer.findByText('Write the note first.')).toBeInTheDocument();
    await user.type(
      drawer.getByRole('textbox', { name: 'Add a note' }),
      'Called the merchant, waiting for the supplier',
    );
    await user.click(drawer.getByRole('button', { name: 'Add note' }));
    expect(await screen.findByText('Note added')).toBeInTheDocument();
    expect(await drawer.findAllByText('Called the merchant, waiting for the supplier')).not.toHaveLength(0);
    expect(drawer.getByRole('textbox', { name: 'Add a note' })).toHaveValue('');
  });
});

describe('files', () => {
  it('links to the result file through the API when the staff member may read files', async () => {
    const { drawer } = await openDrawer(FILE_RESULT, 'ORD-48100');
    expect(drawer.getByRole('link', { name: 'Download the result file' })).toHaveAttribute(
      'href',
      'http://api.test/admin/files/48100',
    );
  });
});

describe('permissions', () => {
  it('disables the order actions without orders:update, with the reason, and hides the reply box and the note form', async () => {
    const { drawer } = await openDrawer(NORMAL, 'ORD-48859', { permissions: ['orders:read'] });
    for (const name of ['Complete', 'Reject…']) {
      const button = drawer.getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'You need the orders:update permission');
    }
    expect(drawer.getByRole('button', { name: /Retry or reroute/ })).toBeDisabled();
    expect(drawer.queryByRole('textbox', { name: 'Reply to send when completing' })).not.toBeInTheDocument();
    expect(drawer.queryByRole('button', { name: 'Add note' })).not.toBeInTheDocument();
  });

  it('disables Reopen and Refund without orders:reopen', async () => {
    const { drawer } = await openDrawer(DELIVERED, 'ORD-48101', {
      permissions: ['orders:read', 'orders:update'],
    });
    for (const name of ['Reopen…', 'Refund…']) {
      const button = drawer.getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'You need the orders:reopen permission');
    }
  });

  it('hides the ledger link without ledger:read and the file link without files:read', async () => {
    const { drawer } = await openDrawer(FILE_RESULT, 'ORD-48100', { permissions: ['orders:read'] });
    expect(drawer.getByRole('button', { name: 'How was this priced?' })).toBeInTheDocument();
    expect(drawer.queryByRole('button', { name: 'Ledger entries' })).not.toBeInTheDocument();
    expect(drawer.queryByRole('link', { name: 'Download the result file' })).not.toBeInTheDocument();
  });

  it('shows the ledger entries link to a staff member who may read the ledger', async () => {
    const { drawer } = await openDrawer(NORMAL, 'ORD-48859', { permissions: ['orders:read', 'ledger:read'] });
    expect(drawer.getByRole('button', { name: 'Ledger entries' })).toBeInTheDocument();
  });
});
