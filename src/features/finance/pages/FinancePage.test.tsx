// Tests for the Finance page frame and the Ledger tab, run through the whole app against the dev mock API: the tabs a role
// may open, the header and key figures, the journal list with its filters, the entry drawer and Run reconciliation.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { financeTabs, openFinance, strip, tabTexts, tableNamed } from '../test/financePage';

setupMockApi();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite
// runs in parallel. Every flow here also goes through the mock API, so give them room.
vi.setConfig({ testTimeout: 20_000 });

describe('the page', () => {
  it('opens on the Ledger with the five tabs and the number of deposits waiting', async () => {
    await openFinance();
    await waitFor(() =>
      expect(tabTexts()).toEqual(['Ledger', 'Deposits6', 'Trial balance', 'Invoices', 'Reports']),
    );
    expect(financeTabs().getByRole('tab', { name: 'Ledger' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('tab', { name: /Withdrawals/ })).not.toBeInTheDocument();
    expect(await screen.findByText('6 deposits need a decision.')).toBeInTheDocument();
  });

  it('shows the five key figures from the server', async () => {
    await openFinance();
    await waitFor(() => expect(strip().getByText('Bank').nextElementSibling).toHaveTextContent(/^\$\d/));
    expect(strip().getByText('Merchant wallets')).toBeInTheDocument();
    expect(strip().getByText('Held in open orders')).toBeInTheDocument();
    expect(strip().getByText('Supplier prepaid')).toBeInTheDocument();
    expect(await strip().findByText('deposits to approve or reject')).toBeInTheDocument();
    expect(strip().getByText('Waiting for review').nextElementSibling).toHaveTextContent('6');
  });

  it('keeps the tab in the address and drops the other tab’s parameters', async () => {
    const user = userEvent.setup();
    const app = await openFinance('/finance?q=hold&kind=order_hold');
    await user.click(financeTabs().getByRole('tab', { name: /Deposits/ }));
    expect(app.location()).toBe('/finance?tab=payments');
    await user.click(financeTabs().getByRole('tab', { name: 'Ledger' }));
    expect(app.location()).toBe('/finance');
  });

  it('opens the tab named in the address, and the first allowed tab when it is not allowed', async () => {
    await openFinance('/finance?tab=accounts');
    expect(financeTabs().getByRole('tab', { name: 'Trial balance' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('shows only the tabs and figures a role may read', async () => {
    await openFinance('/finance?tab=invoices', { permissions: ['payments:read', 'invoices:read'] });
    await waitFor(() => expect(tabTexts()).toEqual(['Deposits6', 'Invoices']));
    // The address asked for a tab the role has, so it shows; the figures it may not read are left out.
    expect(financeTabs().getByRole('tab', { name: 'Invoices' })).toHaveAttribute('aria-selected', 'true');
    expect(strip().queryByText('Bank')).not.toBeInTheDocument();
    expect(strip().queryByText('Merchant wallets')).not.toBeInTheDocument();
    expect(strip().getByText('Waiting for review')).toBeInTheDocument();
  });

  it('falls back to the first tab the role may open', async () => {
    await openFinance('/finance?tab=ledger', { permissions: ['payments:read'] });
    expect(financeTabs().getByRole('tab', { name: /Deposits/ })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('table', { name: 'Deposits' })).toBeInTheDocument();
  });
});

describe('the Ledger tab', () => {
  it('lists the newest journals first with the demo’s columns', async () => {
    await openFinance();
    const table = await tableNamed('Ledger journals');
    const rows = await table.findAllByRole('row');
    expect(rows).toHaveLength(26); // the header and 25 entries
    expect(rows[1]).toHaveTextContent('JRN-01962');
    expect(rows[1]).toHaveTextContent('Order hold');
    expect(rows[1]).toHaveTextContent('Hold for ORD-48859');
    expect(rows[1]).toHaveTextContent('Muscat Mobile Clinic');
    expect(rows[1]).toHaveTextContent('$12.49');
    expect(await screen.findByText('1,962 entries')).toBeInTheDocument();
    for (const name of ['Time', 'Journal', 'Type', 'Memo', 'Merchant', 'Amount', 'By']) {
      expect(table.getByRole('columnheader', { name: new RegExp(`^${name}`) })).toBeInTheDocument();
    }
  });

  it('filters by type through the server and keeps the type in the address', async () => {
    const user = userEvent.setup();
    const app = await openFinance();
    await screen.findByText('1,962 entries');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by type' }), 'deposit');
    expect(app.location()).toBe('/finance?kind=deposit');
    expect(await screen.findByText('46 entries')).toBeInTheDocument();
    const first = (await tableNamed('Ledger journals')).getAllByRole('row')[1];
    expect(first).toHaveTextContent(/Deposit PAY-/);
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(app.location()).toBe('/finance');
    expect(await screen.findByText('1,962 entries')).toBeInTheDocument();
  });

  it('searches after a pause and says when nothing matches', async () => {
    const user = userEvent.setup();
    const app = await openFinance();
    await screen.findByText('1,962 entries');
    await user.type(
      screen.getByRole('searchbox', { name: 'Search journal, memo, merchant' }),
      'Hold for ORD-48100',
    );
    await waitFor(() => expect(app.location()).toBe('/finance?q=Hold+for+ORD-48100'));
    expect(await screen.findByText('1 entry')).toBeInTheDocument();

    await user.clear(screen.getByRole('searchbox', { name: 'Search journal, memo, merchant' }));
    await user.type(
      screen.getByRole('searchbox', { name: 'Search journal, memo, merchant' }),
      'no such memo',
    );
    expect(await screen.findByText('No entries match')).toBeInTheDocument();
    // The toolbar and the empty state both offer it.
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
    expect(await screen.findByText('1,962 entries')).toBeInTheDocument();
  });

  it('pages 25 at a time and sorts on the server', async () => {
    const user = userEvent.setup();
    const app = await openFinance();
    expect(await screen.findByText('Page 1 of 79')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(app.location()).toBe('/finance?page=2');
    expect(await screen.findByText('Page 2 of 79')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Journal/ }));
    expect(app.location()).toBe('/finance?sort=id&dir=asc');
    await waitFor(async () =>
      expect((await tableNamed('Ledger journals')).getAllByRole('row')[1]).toHaveTextContent('JRN-00001'),
    );
  });

  it('shows the account filter from the trial balance as a chip that can be removed', async () => {
    const user = userEvent.setup();
    let seen = '';
    mockServer.use(
      http.get('*/admin/ledger/transactions', ({ request }) => {
        seen = new URL(request.url).searchParams.get('accountKind') ?? '';
        return HttpResponse.json([], { headers: { 'x-total-count': '0' } });
      }),
    );
    const app = await openFinance('/finance?account=bank');
    const chip = await screen.findByRole('button', { name: 'Remove account filter Bank' });
    expect(chip).toHaveTextContent('Account: Bank');
    expect(seen).toBe('bank');
    expect(await screen.findByText('No entries match')).toBeInTheDocument();
    await user.click(chip);
    expect(app.location()).toBe('/finance');
  });

  it('opens a journal in a drawer with its lines and a link to what it is about', async () => {
    const user = userEvent.setup();
    const app = await openFinance();
    await user.click(await screen.findByRole('button', { name: 'JRN-01962' }));
    expect(app.location()).toBe('/finance?journal=1962');
    const drawer = within(await screen.findByRole('dialog', { name: 'JRN-01962' }));
    expect(drawer.getByText('Hold for ORD-48859')).toBeInTheDocument();
    const lines = within(drawer.getByRole('table', { name: 'Journal lines' }));
    expect(lines.getByText('client_wallet')).toBeInTheDocument();
    expect(lines.getByText('client_hold')).toBeInTheDocument();
    expect(lines.getAllByText('$12.49').length).toBeGreaterThanOrEqual(3);
    expect(drawer.getByRole('link', { name: 'Order #48859' })).toHaveAttribute('href', '/orders?order=48859');
    expect(drawer.getByText(/Debits equal credits\. Posted entries are never edited/)).toBeInTheDocument();
    await user.click(drawer.getByRole('button', { name: 'Close details' }));
    await waitFor(() => expect(app.location()).toBe('/finance'));
  });

  it('opens the drawer of an entry that is not on the page from a link', async () => {
    await openFinance('/finance?journal=25');
    const drawer = within(await screen.findByRole('dialog', { name: 'JRN-00025' }));
    expect(await drawer.findByText('Hold for ORD-48100')).toBeInTheDocument();
  });

  it('shows the server’s error with Retry when the list fails', async () => {
    mockServer.use(
      http.get('*/admin/ledger/transactions', () =>
        HttpResponse.json(
          { title: 'Ledger unavailable', status: 503, code: 'UNAVAILABLE', detail: 'Try again soon.' },
          { status: 503, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    await openFinance();
    expect(
      await screen.findByText('Could not load the ledger', undefined, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

describe('Run reconciliation', () => {
  it('shows the server’s result when every account matches', async () => {
    const user = userEvent.setup();
    await openFinance();
    await user.click(screen.getByRole('button', { name: 'Run reconciliation' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Reconciliation finished' }));
    expect(
      dialog.getByText('No differences. Every account matches the entries behind it.'),
    ).toBeInTheDocument();
    expect(dialog.getByText(/Checked \d+ accounts and [\d,]+ entries/)).toBeInTheDocument();
    await user.click(dialog.getAllByRole('button', { name: 'Close' }).at(-1) as HTMLElement);
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Reconciliation finished' })).not.toBeInTheDocument(),
    );
  });

  it('lists the accounts that differ', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/ledger/reconcile', () =>
        HttpResponse.json({
          ranAt: new Date().toISOString(),
          accountsChecked: 41,
          entriesChecked: 3902,
          differences: [
            {
              accountId: 7,
              kind: 'client_wallet',
              ownerName: 'Zain Mobile Hub',
              stored: '120.0000',
              expected: '100.0000',
              difference: '20.0000',
            },
          ],
        }),
      ),
    );
    await openFinance();
    await user.click(screen.getByRole('button', { name: 'Run reconciliation' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Reconciliation found differences' }));
    expect(dialog.getByText('1 account differs from its entries.')).toBeInTheDocument();
    const row = within(dialog.getByText(/Client wallets/).closest('tr') as HTMLElement);
    expect(row.getByText(/Zain Mobile Hub/)).toBeInTheDocument();
    expect(row.getByText('$120.00')).toBeInTheDocument();
    expect(row.getByText('$100.00')).toBeInTheDocument();
    expect(row.getByText('$20.00')).toBeInTheDocument();
  });

  it('shows the server’s error when the run fails', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/ledger/reconcile', () =>
        HttpResponse.json(
          {
            title: 'Reconciliation already running',
            status: 409,
            code: 'CONFLICT',
            detail: 'Wait for the first run.',
          },
          { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    await openFinance();
    await user.click(screen.getByRole('button', { name: 'Run reconciliation' }));
    expect(await screen.findByText('Reconciliation already running')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /Reconciliation/ })).not.toBeInTheDocument();
  });

  it('is disabled, with the missing permission in its title, without ledger:reconcile', async () => {
    await openFinance('/finance', { permissions: ['ledger:read'] });
    const button = screen.getByRole('button', { name: 'Run reconciliation' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'You need the ledger:reconcile permission');
  });
});
