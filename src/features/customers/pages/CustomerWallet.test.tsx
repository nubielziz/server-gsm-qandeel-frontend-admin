// Tests for the Wallet tab of a customer's page, run through the whole app against the dev mock API: the tab shows only with
// wallet:read, the summary and the statement, the journal dialog, and the adjust, hold and lift-hold dialogs (what they check, what
// they send, the server's refusal in the dialog, and one Idempotency-Key for every retry of one opening).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { detailTabs, openCustomer } from '../test/customersPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

const DANIEL = /Daniel Whitmore/; // c1: an account with the seeded $50 top-up
const panel = () => within(screen.getByRole('tabpanel'));
// The value under a figure's label ("Balance" is also a column header of the statement, so the first match is the figure).
const figure = (label: string) => panel().getAllByText(label)[0].nextElementSibling;

type Seen = { body: unknown; key: string | null };

/** Records the body and Idempotency-Key of every call to a wallet write, then lets the mock answer as usual. */
function record(action: 'adjust' | 'freeze' | 'unfreeze'): Seen[] {
  const seen: Seen[] = [];
  mockServer.use(
    http.post(`*/admin/customers/:id/wallet/${action}`, async ({ request }) => {
      seen.push({ body: await request.clone().json(), key: request.headers.get('Idempotency-Key') });
      return undefined;
    }),
  );
  return seen;
}

describe('the tab', () => {
  it('is listed and opens with the figures, for a staff member with wallet:read', async () => {
    const user = userEvent.setup();
    const app = await openCustomer(1, DANIEL);
    await user.click(detailTabs().getByRole('tab', { name: 'Wallet' }));
    expect(app.location()).toBe('/customers/1?tab=wallet');
    expect(await panel().findByText('Available')).toBeInTheDocument();
    expect(figure('Balance')).toHaveTextContent('$50.00');
    expect(figure('Open disputes')).toHaveTextContent('0');
    expect(panel().getByRole('button', { name: 'Adjust balance' })).toBeEnabled();
  });

  it('is left out without wallet:read, and an address that names it shows the Orders tab', async () => {
    await openCustomer(1, DANIEL, { tab: 'wallet', permissions: ['customers:read', 'orders:read'] });
    expect(detailTabs().queryByRole('tab', { name: 'Wallet' })).not.toBeInTheDocument();
    expect(detailTabs().getByRole('tab', { name: /^Orders/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('turns the buttons off, and names the permission, without wallet:adjust', async () => {
    await openCustomer(1, DANIEL, {
      tab: 'wallet',
      permissions: ['customers:read', 'wallet:read'],
    });
    const adjust = await panel().findByRole('button', { name: 'Adjust balance' });
    expect(adjust).toBeDisabled();
    expect(adjust).toHaveAttribute('title', 'You need the wallet:adjust permission');
    expect(panel().getByRole('button', { name: 'Put on hold…' })).toBeDisabled();
  });

  it('lists the statement and opens the journal behind a line, which needs ledger:read', async () => {
    const user = userEvent.setup();
    await openCustomer(1, DANIEL, { tab: 'wallet' });
    const table = await panel().findByRole('table', { name: 'Balance statement' });
    expect(within(table).getByText(/Top-up PAY-2001/)).toBeInTheDocument();
    expect(within(table).getByText('+$50.00')).toBeInTheDocument();
    await user.click(within(table).getByRole('button', { name: /^View journal/ }));
    const dialog = await screen.findByRole('dialog', { name: /Top-up PAY-2001/ });
    expect(await within(dialog).findByText(/customer_wallet/i)).toBeInTheDocument();
  });

  it('disables the journal button without ledger:read', async () => {
    await openCustomer(1, DANIEL, { tab: 'wallet', permissions: ['customers:read', 'wallet:read'] });
    const table = await panel().findByRole('table', { name: 'Balance statement' });
    const button = await within(table).findByRole('button', { name: /^View journal/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'You need the ledger:read permission');
  });
});

describe('adjust balance', () => {
  async function openAdjust() {
    const user = userEvent.setup();
    await openCustomer(1, DANIEL, { tab: 'wallet' });
    await user.click(await panel().findByRole('button', { name: 'Adjust balance' }));
    const dialog = await screen.findByRole('dialog', { name: 'Adjust balance' });
    return { user, dialog: within(dialog) };
  }

  it('checks the amount and the reason before sending anything', async () => {
    const seen = record('adjust');
    const { user, dialog } = await openAdjust();
    await user.type(dialog.getByLabelText('Amount (USD)'), '25,50');
    await user.type(dialog.getByLabelText('Reason'), 'abc');
    await user.click(dialog.getByRole('button', { name: 'Post adjustment' }));
    expect(await dialog.findByText('Enter an amount greater than zero, like 25.00.')).toBeInTheDocument();
    expect(dialog.getByText(/Add a reason of at least 5 characters/)).toBeInTheDocument();
    expect(seen).toEqual([]);
  });

  it('posts a credit with a key, closes, and shows the new balance', async () => {
    const seen = record('adjust');
    const { user, dialog } = await openAdjust();
    await user.type(dialog.getByLabelText('Amount (USD)'), '10');
    await user.type(dialog.getByLabelText('Reason'), 'Goodwill credit for a slow unlock');
    await user.click(dialog.getByRole('button', { name: 'Post adjustment' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Adjust balance' })).not.toBeInTheDocument(),
    );
    expect(seen).toHaveLength(1);
    expect(seen[0].body).toEqual({
      amount: '10.0000',
      direction: 'credit',
      reason: 'Goodwill credit for a slow unlock',
    });
    expect(seen[0].key).toMatch(/\S+/);
    await waitFor(() => expect(figure('Balance')).toHaveTextContent('$60.00'));
  });

  it('shows the server’s refusal in the dialog, and a retry of the same opening sends the same key', async () => {
    const seen = record('adjust');
    const { user, dialog } = await openAdjust();
    await user.type(dialog.getByLabelText('Amount (USD)'), '9000');
    await user.type(dialog.getByLabelText('Reason'), 'Big credit for a partner');
    await user.click(dialog.getByRole('button', { name: 'Post adjustment' }));
    expect(await dialog.findByText(/need a second approver/)).toBeInTheDocument();
    await user.clear(dialog.getByLabelText('Amount (USD)'));
    await user.type(dialog.getByLabelText('Amount (USD)'), '8000');
    await user.click(dialog.getByRole('button', { name: 'Post adjustment' }));
    await waitFor(() => expect(seen).toHaveLength(2));
    expect(seen[0].key).toBe(seen[1].key);
  });

  it('makes a new key for each opening of the dialog', async () => {
    const seen = record('adjust');
    const { user, dialog } = await openAdjust();
    await user.type(dialog.getByLabelText('Amount (USD)'), '9000');
    await user.type(dialog.getByLabelText('Reason'), 'Big credit for a partner');
    await user.click(dialog.getByRole('button', { name: 'Post adjustment' }));
    await dialog.findByText(/need a second approver/);
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    await user.click(await panel().findByRole('button', { name: 'Adjust balance' }));
    const again = within(await screen.findByRole('dialog', { name: 'Adjust balance' }));
    await user.type(again.getByLabelText('Amount (USD)'), '9000');
    await user.type(again.getByLabelText('Reason'), 'Big credit for a partner');
    await user.click(again.getByRole('button', { name: 'Post adjustment' }));
    await waitFor(() => expect(seen).toHaveLength(2));
    expect(seen[0].key).not.toBe(seen[1].key);
  });

  it('refuses a debit below zero with the server’s words', async () => {
    const { user, dialog } = await openAdjust();
    await user.selectOptions(dialog.getByLabelText('Direction'), 'debit');
    await user.type(dialog.getByLabelText('Amount (USD)'), '80');
    await user.type(dialog.getByLabelText('Reason'), 'Take back a mistake');
    await user.click(dialog.getByRole('button', { name: 'Post adjustment' }));
    expect(await dialog.findByText('A debit cannot take the balance below zero.')).toBeInTheDocument();
  });
});

describe('hold', () => {
  it('puts the balance on hold with a reason, shows the hold, then lifts it', async () => {
    const user = userEvent.setup();
    const freezes = record('freeze');
    const lifts = record('unfreeze');
    await openCustomer(1, DANIEL, { tab: 'wallet' });
    await user.click(await panel().findByRole('button', { name: 'Put on hold…' }));
    const dialog = within(await screen.findByRole('dialog', { name: /hold/i }));
    await user.type(dialog.getByLabelText('Reason'), 'Checking a disputed top-up');
    await user.click(dialog.getByRole('button', { name: /hold/i }));
    expect(await panel().findByText('On hold')).toBeInTheDocument();
    expect(panel().getByText(/Checking a disputed top-up/)).toBeInTheDocument();
    expect(freezes[0].body).toEqual({ reason: 'Checking a disputed top-up' });
    expect(freezes[0].key).toMatch(/\S+/);

    await user.click(panel().getByRole('button', { name: 'Lift hold…' }));
    const lift = within(await screen.findByRole('dialog', { name: /hold/i }));
    await user.type(lift.getByLabelText('Reason'), 'The dispute was won');
    await user.click(lift.getByRole('button', { name: /lift/i }));
    await waitFor(() => expect(panel().queryByText('On hold')).not.toBeInTheDocument());
    expect(lifts[0].body).toEqual({ reason: 'The dispute was won' });
    expect(lifts[0].key).not.toBe(freezes[0].key);
  });
});
