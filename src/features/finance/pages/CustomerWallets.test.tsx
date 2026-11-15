// Tests for feature 21 inside Finance, run through the whole app against the dev mock API: the customers' top-ups on the Deposits
// tab (the customer instead of a merchant, the payer filter, the dispute chip, approving one), the Customer wallets tab, and the
// trial balance line for customer wallets.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { financeTabs, openFinance, rowWith, tableNamed } from '../test/financePage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

describe('customer top-ups on the Deposits tab', () => {
  it('shows the customer, a link to their wallet and a masked email where a merchant would be', async () => {
    await openFinance('/finance?tab=payments&owner=customer');
    const table = await tableNamed('Deposits');
    const row = (await table.findByText('First top-up of this customer.')).closest('tr') as HTMLElement;
    const link = within(row).getByRole('link', { name: /\w+/ });
    expect(link.getAttribute('href')).toMatch(/^\/customers\/\d+\?tab=wallet$/);
    expect(within(row).getByText(/· customer ·/)).toBeInTheDocument();
  });

  it('filters by payer through the server and keeps it in the address', async () => {
    const user = userEvent.setup();
    const app = await openFinance('/finance?tab=payments&status=all');
    await screen.findByRole('button', { name: 'All 56' });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by payer' }), 'customer');
    expect(app.location()).toContain('owner=customer');
    expect(await screen.findByRole('button', { name: 'All 2' })).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by payer' }), 'merchant');
    expect(await screen.findByRole('button', { name: 'All 54' })).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by payer' }), 'all');
    expect(app.location()).not.toContain('owner=');
  });

  it('shows the dispute chip on a top-up that has a chargeback', async () => {
    mockServer.use(
      http.get('*/admin/payments', ({ request }) => {
        if (new URL(request.url).searchParams.get('owner') !== 'customer') return undefined;
        return HttpResponse.json(
          [
            {
              id: 3001,
              purpose: 'topup',
              status: 'approved',
              methodType: 'card',
              amount: '50.0000',
              feeAmount: '1.5000',
              netAmount: '48.5000',
              currency: 'USD',
              gatewayTxnId: 'ch_1',
              capturedAt: '2026-11-01T10:00:00.000Z',
              createdAt: '2026-11-01T10:00:00.000Z',
              invoiceId: null,
              receiptFileId: null,
              client: null,
              customer: {
                id: 1,
                name: 'Daniel Whitmore',
                email: 'daniel@example.com',
                walletBalance: '0.0000',
              },
              dispute: {
                id: 9,
                status: 'needs_response',
                reasonCode: 'fraudulent',
                amount: { value: '50.0000', currency: 'USD' },
                fee: { value: '15.0000', currency: 'USD' },
                evidenceDueAt: '2026-11-20T00:00:00.000Z',
                resolvedAt: null,
                transactionId: null,
              },
              gateway: { id: 3, name: 'Card' },
              reviewedBy: null,
              reviewedAt: null,
              note: null,
            },
          ],
          { headers: { 'x-total-count': '1' } },
        );
      }),
    );
    await openFinance('/finance?tab=payments&status=all&owner=customer');
    expect(await screen.findByText('Dispute: evidence needed')).toBeInTheDocument();
  });

  it('approves a customer’s top-up and credits their store balance', async () => {
    const user = userEvent.setup();
    await openFinance('/finance?tab=payments&payment=2002');
    const dialog = within(await screen.findByRole('dialog', { name: 'Review deposit PAY-2002' }));
    expect(await dialog.findByRole('link', { name: 'Lukas Brandt' })).toHaveAttribute(
      'href',
      '/customers/3?tab=wallet',
    );
    await user.click(await dialog.findByRole('button', { name: /^Approve and credit/ }));
    expect(await screen.findByText('PAY-2002 approved')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /PAY-2002/ })).not.toBeInTheDocument());
  });
});

describe('the Customer wallets tab', () => {
  it('lists the seeded balances with a state each and counts them', async () => {
    await openFinance('/finance?tab=wallets');
    const table = await tableNamed('Customer wallets');
    expect(await table.findAllByText('$50.00')).toHaveLength(1);
    expect(await screen.findByText('1 wallet')).toBeInTheDocument();
  });

  it('filters by state through the server and keeps it in the address', async () => {
    const user = userEvent.setup();
    const app = await openFinance('/finance?tab=wallets');
    await screen.findByText('1 wallet');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by state' }), 'frozen');
    expect(app.location()).toContain('state=frozen');
    expect(await screen.findByText('No wallets match')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
    expect(await screen.findByText('1 wallet')).toBeInTheDocument();
  });

  it('is offered only with wallet:read', async () => {
    await openFinance('/finance', { permissions: ['payments:read', 'wallet:read'] });
    await waitFor(() =>
      expect(financeTabs().getByRole('tab', { name: 'Customer wallets' })).toBeInTheDocument(),
    );
  });
});

describe('a customer with no name', () => {
  const wallet = (id: number, name: string, email: string) => ({
    customer: { id, name, email, status: 'active' },
    balance: '12.0000',
    frozen: null,
    updatedAt: '2026-11-01T10:00:00.000Z',
  });

  it('is shown by the masked email, as a link to their wallet, with "No name" under it', async () => {
    mockServer.use(
      http.get('*/admin/customer-wallets', () =>
        HttpResponse.json(
          [wallet(5, '', 'maya@example.com'), wallet(6, 'Daniel Whitmore', 'daniel@example.com')],
          {
            headers: { 'x-total-count': '2', 'access-control-expose-headers': 'x-total-count' },
          },
        ),
      ),
    );
    await openFinance('/finance?tab=wallets');
    const table = await tableNamed('Customer wallets');
    const nameless = within(
      (await table.findByRole('link', { name: 'ma•••@example.com' })).closest('tr') as HTMLElement,
    );
    expect(nameless.getByRole('link', { name: 'ma•••@example.com' })).toHaveAttribute(
      'href',
      '/customers/5?tab=wallet',
    );
    expect(nameless.getByText('No name')).toBeInTheDocument();
    expect(nameless.queryByText('maya@example.com')).not.toBeInTheDocument();

    // A customer who has a name keeps it, with the masked email under it.
    const named = within(table.getByRole('link', { name: 'Daniel Whitmore' }).closest('tr') as HTMLElement);
    expect(named.getByText('da•••@example.com')).toBeInTheDocument();
    expect(named.queryByText('No name')).not.toBeInTheDocument();
  });
});

describe('the trial balance', () => {
  it('names the customer wallets account as a liability', async () => {
    mockServer.use(
      http.get('*/admin/ledger/accounts', () =>
        HttpResponse.json({
          currency: 'USD',
          rows: [
            { kind: 'bank', balance: '50.0000', accounts: 1 },
            { kind: 'customer_wallet', balance: '-50.0000', accounts: 1 },
          ],
        }),
      ),
    );
    await openFinance('/finance?tab=accounts');
    const wallets = await rowWith('Trial balance', 'Customer wallets');
    expect(wallets.getByText('Liability')).toBeInTheDocument();
  });
});
