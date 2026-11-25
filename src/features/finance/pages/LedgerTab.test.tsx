// Tests for the Ledger view (Books), run through the whole app against the dev mock API: the journal list with its filters, sort and
// paging kept in the address, the account chip from the trial balance, the entry drawer and the server's error with Retry.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { openFinance, tableNamed } from '../test/financePage';

setupMockApi();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite
// runs in parallel. Every flow here also goes through the mock API, so give them room.
vi.setConfig({ testTimeout: 20_000 });

describe('the Ledger view', () => {
  it('lists the newest journals first with the demo’s columns', async () => {
    await openFinance();
    const table = await tableNamed('Ledger journals');
    const rows = await table.findAllByRole('row');
    expect(rows).toHaveLength(26); // the header and 25 entries
    expect(rows[1]).toHaveTextContent('JRN-01962');
    expect(rows[1]).toHaveTextContent('Order hold');
    expect(rows[1]).toHaveTextContent('Hold for ORD-48859');
    expect(rows[1]).toHaveTextContent('Muscat Mobile Clinic');
    // The owner of the wallet line is an account: its name leads to the Financial part of the account's record.
    expect(within(rows[1]).getByRole('link', { name: 'Muscat Mobile Clinic' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/accounts\/\d+\?tab=wallet$/),
    );
    expect(rows[1]).toHaveTextContent('$12.49');
    expect(await screen.findByText('1,962 entries')).toBeInTheDocument();
    for (const name of ['Time', 'Journal', 'Type', 'Memo', 'Account', 'Amount', 'By']) {
      expect(table.getByRole('columnheader', { name: new RegExp(`^${name}`) })).toBeInTheDocument();
    }
  });

  it('filters by type through the server and keeps the type in the address', async () => {
    const user = userEvent.setup();
    const app = await openFinance();
    await screen.findByText('1,962 entries');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by type' }), 'deposit');
    expect(app.location()).toBe('/money?view=ledger&kind=deposit');
    expect(await screen.findByText('46 entries')).toBeInTheDocument();
    const first = (await tableNamed('Ledger journals')).getAllByRole('row')[1];
    expect(first).toHaveTextContent(/Deposit PAY-/);
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(app.location()).toBe('/money?view=ledger');
    expect(await screen.findByText('1,962 entries')).toBeInTheDocument();
  });

  it('searches after a pause and says when nothing matches', async () => {
    const user = userEvent.setup();
    const app = await openFinance();
    await screen.findByText('1,962 entries');
    await user.type(
      screen.getByRole('searchbox', { name: 'Search journal, memo, account' }),
      'Hold for ORD-48100',
    );
    await waitFor(() => expect(app.location()).toBe('/money?view=ledger&q=Hold+for+ORD-48100'));
    expect(await screen.findByText('1 entry')).toBeInTheDocument();

    await user.clear(screen.getByRole('searchbox', { name: 'Search journal, memo, account' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search journal, memo, account' }), 'no such memo');
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
    expect(app.location()).toBe('/money?view=ledger&page=2');
    expect(await screen.findByText('Page 2 of 79')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Journal/ }));
    expect(app.location()).toBe('/money?view=ledger&sort=id&dir=asc');
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
    const app = await openFinance('/money?view=ledger&account=bank');
    const chip = await screen.findByRole('button', { name: 'Remove account filter Bank' });
    expect(chip).toHaveTextContent('Account: Bank');
    expect(seen).toBe('bank');
    expect(await screen.findByText('No entries match')).toBeInTheDocument();
    await user.click(chip);
    expect(app.location()).toBe('/money?view=ledger');
  });

  it('opens a journal in a drawer with its lines and a link to what it is about', async () => {
    const user = userEvent.setup();
    const app = await openFinance();
    await user.click(await screen.findByRole('button', { name: 'JRN-01962' }));
    expect(app.location()).toBe('/money?view=ledger&journal=1962');
    const drawer = within(await screen.findByRole('dialog', { name: 'JRN-01962' }));
    expect(drawer.getByText('Hold for ORD-48859')).toBeInTheDocument();
    const lines = within(drawer.getByRole('table', { name: 'Journal lines' }));
    expect(lines.getByText('client_wallet')).toBeInTheDocument();
    expect(lines.getByText('client_hold')).toBeInTheDocument();
    expect(lines.getAllByText('$12.49').length).toBeGreaterThanOrEqual(3);
    expect(drawer.getByRole('link', { name: 'Order #48859' })).toHaveAttribute('href', '/orders?order=48859');
    expect(drawer.getByText(/Debits equal credits\. Posted entries are never edited/)).toBeInTheDocument();
    await user.click(drawer.getByRole('button', { name: 'Close details' }));
    await waitFor(() => expect(app.location()).toBe('/money?view=ledger'));
  });

  it('opens the drawer of an entry that is not on the page from a link', async () => {
    await openFinance('/money?view=ledger&journal=25');
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
