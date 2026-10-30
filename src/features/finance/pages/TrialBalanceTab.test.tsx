// Tests for the Trial balance tab, run through the whole app against the dev mock API: the accounts with their debit or
// credit, the totals and integrity check from the server, and the Entries button that opens the ledger on one account.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { openFinance, rowWith, tableNamed } from '../test/financePage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

describe('the trial balance', () => {
  it('lists the accounts in the demo’s order with a debit or a credit each, and the totals', async () => {
    await openFinance('/finance?tab=accounts');
    const table = await tableNamed('Trial balance');
    const names = (await table.findAllByRole('row')).map((row) => row.textContent ?? '');
    expect(names[1]).toMatch(/^Bank/);
    expect(names.findIndex((text) => text.startsWith('Client wallets'))).toBeGreaterThan(1);
    const bank = await rowWith('Trial balance', 'Bank');
    expect(bank.getByText('Asset')).toBeInTheDocument();
    expect(bank.getByText('bank')).toBeInTheDocument();
    expect(bank.getByText(/^\$\d/)).toBeInTheDocument();
    const wallets = await rowWith('Trial balance', 'Client wallets');
    expect(wallets.getByText('Liability')).toBeInTheDocument();
    // A liability is a credit: the debit cell holds a dash.
    expect(wallets.getAllByText('–')).toHaveLength(1);
    const total = within(table.getByText('Total').closest('tr') as HTMLElement).getAllByText(/^\$/);
    expect(total).toHaveLength(2);
    expect(total[0].textContent).toBe(total[1].textContent);
  });

  it('says the books balance, and points to Run reconciliation for the rest', async () => {
    await openFinance('/finance?tab=accounts');
    expect(await screen.findByText('Integrity checks')).toBeInTheDocument();
    expect(screen.getByText('Debits equal credits')).toBeInTheDocument();
    expect(screen.getByText(/^Passes\. \$[\d,.]+ on both sides$/)).toBeInTheDocument();
    expect(screen.getByText('Accounts match their entries')).toBeInTheDocument();
  });

  it('flags totals that do not match', async () => {
    mockServer.use(
      http.get('*/admin/ledger/accounts', () =>
        HttpResponse.json({
          currency: 'USD',
          rows: [
            { kind: 'bank', balance: '100.0000', accounts: 1 },
            { kind: 'revenue', balance: '-90.0000', accounts: 1 },
          ],
          totalDebit: '100.0000',
          totalCredit: '90.0000',
        }),
      ),
    );
    await openFinance('/finance?tab=accounts');
    expect(
      await screen.findByText(/^Does not match\. \$100\.00 of debits against \$90\.00 of credits$/),
    ).toBeInTheDocument();
  });

  it('opens the ledger on one account with the Entries button', async () => {
    const user = userEvent.setup();
    const app = await openFinance('/finance?tab=accounts');
    await user.click(await screen.findByRole('button', { name: 'View ledger entries for Bank' }));
    expect(app.location()).toBe('/finance?account=bank');
    expect(await screen.findByRole('button', { name: 'Remove account filter Bank' })).toBeInTheDocument();
  });

  it('shows the server’s error with Retry when the balances cannot be read', async () => {
    mockServer.use(
      http.get('*/admin/ledger/accounts', () =>
        HttpResponse.json(
          {
            title: 'Ledger unavailable',
            status: 403,
            code: 'FORBIDDEN',
            detail: 'You cannot read the ledger.',
          },
          { status: 403, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    await openFinance('/finance?tab=accounts');
    expect(await screen.findByText('Could not load the trial balance')).toBeInTheDocument();
    expect(screen.getByText('You cannot read the ledger.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
