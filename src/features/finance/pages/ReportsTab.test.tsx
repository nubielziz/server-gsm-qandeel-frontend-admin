// Tests for the Reports tab, run through the whole app against the dev mock API: profit by day, service, supplier and
// merchant, wallet exposure, VAT by country and the sales funnel, each reading its own route, and the reports a role may open.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { openFinance, tableNamed } from '../test/financePage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

// The mock data is dated from today, and the periods (last month, this quarter) from today too. A fixed day keeps both the
// same on every run: the mock seed covers the five weeks before it.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 15, 12));
});
afterEach(() => {
  vi.useRealTimers();
});

const reportSwitch = () => within(screen.getByRole('group', { name: 'Report' }));

describe('profit', () => {
  it('opens on profit by day: key figures, a chart and a table with the server’s totals', async () => {
    let query = new URLSearchParams();
    mockServer.events.on('request:start', ({ request }) => {
      const url = new URL(request.url);
      if (url.pathname === '/admin/reports/profit') query = url.searchParams;
    });
    await openFinance('/finance?tab=reports');
    const table = await tableNamed('Profit by day');
    expect((await table.findAllByRole('row')).length).toBeGreaterThan(5);
    expect(table.getByText('Total')).toBeInTheDocument();
    const figures = within(screen.getByRole('region', { name: 'Profit totals' }));
    for (const label of ['Revenue', 'Supplier cost', 'Profit', 'Orders'])
      expect(figures.getByText(label)).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /^Stacked bar chart of daily revenue split into cost and profit/ }),
    ).toBeInTheDocument();
    expect(query.get('groupBy')).toBe('day');
    expect(query.get('from')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(query.get('to')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    mockServer.events.removeAllListeners();
  });

  it('splits by merchant and links each merchant to its account, with no chart', async () => {
    const user = userEvent.setup();
    const app = await openFinance('/finance?tab=reports');
    await user.click(await screen.findByRole('button', { name: 'Merchant' }));
    expect(app.location()).toBe('/finance?tab=reports&by=client');
    const table = await tableNamed('Profit by merchant');
    const link = (await table.findAllByRole('link'))[0];
    expect(link).toHaveAttribute('href', expect.stringMatching(/^\/accounts\/[1-9]\d*$/));
    expect(screen.queryByRole('img', { name: /Stacked bar chart/ })).not.toBeInTheDocument();
  });

  it('splits by service and supplier, and changes the period', async () => {
    const user = userEvent.setup();
    const app = await openFinance('/finance?tab=reports');
    await user.click(await screen.findByRole('button', { name: 'Supplier' }));
    expect(await tableNamed('Profit by supplier')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Service' }));
    expect(await tableNamed('Profit by service')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '7 days' }));
    expect(app.location()).toBe('/finance?tab=reports&by=service&range=7');
  });

  it('says so when no order was completed in the range', async () => {
    mockServer.use(
      http.get('*/admin/reports/profit', () =>
        HttpResponse.json({
          groupBy: 'day',
          from: '2026-10-01',
          to: '2026-10-07',
          currency: 'USD',
          rows: [],
          totals: { orders: 0, revenue: '0.0000', cost: '0.0000', profit: '0.0000' },
        }),
      ),
    );
    await openFinance('/finance?tab=reports');
    expect(await screen.findByText('No completed orders in this range')).toBeInTheDocument();
  });

  it('shows the server’s error with Retry', async () => {
    mockServer.use(
      http.get('*/admin/reports/profit', () =>
        HttpResponse.json(
          { title: 'Report failed', status: 500, code: 'INTERNAL', detail: 'The report could not be built.' },
          { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    await openFinance('/finance?tab=reports');
    expect(
      await screen.findByText('Could not load the profit report', undefined, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('The report could not be built.')).toBeInTheDocument();
  });
});

describe('wallet exposure', () => {
  it('shows the totals and the largest wallets first', async () => {
    const user = userEvent.setup();
    const app = await openFinance('/finance?tab=reports');
    await user.click(await reportSwitch().findByRole('button', { name: 'Wallet exposure' }));
    expect(app.location()).toBe('/finance?tab=reports&report=exposure');
    const table = await tableNamed('Wallets by merchant');
    const rows = await table.findAllByRole('row');
    expect(rows.length).toBeGreaterThan(5);
    expect(rows[1]).toHaveTextContent('Phone Doctor FZE');
    const figures = within(screen.getByRole('region', { name: 'Wallet totals' }));
    expect(figures.getByText('Wallet balances')).toBeInTheDocument();
    expect(figures.getByText('Overdraft in use')).toBeInTheDocument();
    expect(figures.getByText(/\d+ merchants$/)).toBeInTheDocument();
    // Each merchant leads to the Financial part of its account.
    expect(within(rows[1]).getByRole('link', { name: 'Phone Doctor FZE' })).toHaveAttribute(
      'href',
      '/accounts/3?tab=wallet',
    );
  });

  it('shows the store balances beside the merchant wallets, and keeps them out of the merchant totals', async () => {
    const user = userEvent.setup();
    await openFinance('/finance?tab=reports');
    await user.click(await reportSwitch().findByRole('button', { name: 'Wallet exposure' }));
    const store = within(await screen.findByRole('region', { name: 'Store balance totals' }));
    expect(store.getByText('Store balances')).toBeInTheDocument();
    expect(store.getByText('Below zero')).toBeInTheDocument();
    expect(store.getByText('On hold')).toBeInTheDocument();
    // The seed holds one credited balance of $50.
    expect(store.getByText('$50')).toBeInTheDocument();
    expect(store.getByText('1 account')).toBeInTheDocument();
  });

  it('draws the store balance totals the server sends, a negative one in red', async () => {
    mockServer.use(
      http.get('*/admin/reports/wallet-exposure', () =>
        HttpResponse.json({
          currency: 'USD',
          totals: {
            clients: 0,
            balance: '0.0000',
            reserved: '0.0000',
            overdraftLimit: '0.0000',
            overdraftUsed: '0.0000',
            inOverdraft: 0,
          },
          storeBalances: { accounts: 3, balance: '-12.0000', negative: 2, frozen: 1 },
          rows: [],
        }),
      ),
    );
    const user = userEvent.setup();
    await openFinance('/finance?tab=reports');
    await user.click(await reportSwitch().findByRole('button', { name: 'Wallet exposure' }));
    // No merchant wallet, yet the store balances still show: the report is not "empty".
    const store = within(await screen.findByRole('region', { name: 'Store balance totals' }));
    expect(store.getByText('3 accounts')).toBeInTheDocument();
    expect(store.getByText('-$12')).toBeInTheDocument();
    expect(screen.queryByText('No merchant wallets yet')).not.toBeInTheDocument();
  });
});

describe('VAT', () => {
  it('shows VAT due by country and month for the period, with the server’s totals', async () => {
    const user = userEvent.setup();
    const app = await openFinance('/finance?tab=reports&report=vat');
    expect(await screen.findByRole('button', { name: 'Last month' })).toHaveAttribute('aria-pressed', 'true');
    const table = await tableNamed('VAT by country');
    expect((await table.findAllByRole('row')).length).toBeGreaterThan(2);
    expect(table.getByText('Total')).toBeInTheDocument();
    expect(table.getAllByText(/^[A-Z]{2}$/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'This quarter' }));
    expect(app.location()).toBe('/finance?tab=reports&report=vat&period=this-quarter');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'This quarter' })).toHaveAttribute('aria-pressed', 'true'),
    );
  });

  it('asks the server for the dates of the period', async () => {
    let query = new URLSearchParams();
    mockServer.events.on('request:start', ({ request }) => {
      const url = new URL(request.url);
      if (url.pathname === '/admin/reports/vat') query = url.searchParams;
    });
    await openFinance('/finance?tab=reports&report=vat&period=this-month');
    await tableNamed('VAT by country').catch(() => undefined);
    await waitFor(() => expect(query.get('from')).toMatch(/^\d{4}-\d{2}-01$/));
    expect(query.get('to')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    mockServer.events.removeAllListeners();
  });
});

describe('sales funnel', () => {
  // Serves the funnel for the period asked, and returns the addresses asked so far.
  function serveFunnel(report: (days: number) => Record<string, number>): URL[] {
    const asked: URL[] = [];
    mockServer.use(
      http.get('*/admin/reports/funnel', ({ request }) => {
        const url = new URL(request.url);
        asked.push(url);
        return HttpResponse.json(report(Number(url.searchParams.get('days') ?? 30)));
      }),
    );
    return asked;
  }
  const steps = async () =>
    within(await screen.findByRole('list', { name: /^Sales funnel, last \d+ days$/ }));

  it("shows the three steps with the server's counts and the share of the step before", async () => {
    const user = userEvent.setup();
    serveFunnel((days) => ({ days, paymentStarted: 300, paid: 120, delivered: 108 }));
    const app = await openFinance('/finance?tab=reports');
    await user.click(await reportSwitch().findByRole('button', { name: 'Sales funnel' }));
    expect(app.location()).toBe('/finance?tab=reports&report=funnel');
    const list = await steps();
    expect(list.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Started a payment300',
      'Paid120 40% of the step before',
      'Delivered108 90% of the step before',
    ]);
    expect(list.queryByText('Checked an IMEI')).not.toBeInTheDocument();
  });

  it('ignores the count of the retired IMEI-check step that an older backend still sends', async () => {
    serveFunnel((days) => ({ days, imeiChecks: 900, paymentStarted: 300, paid: 120, delivered: 108 }));
    await openFinance('/finance?tab=reports&report=funnel');
    const list = await steps();
    expect(list.getAllByRole('listitem')).toHaveLength(3);
    expect(list.queryByText('900')).not.toBeInTheDocument();
  });

  it('asks for the period in the address and changes it with the selector', async () => {
    const user = userEvent.setup();
    const asked = serveFunnel((days) => ({ days, paymentStarted: days * 10, paid: days, delivered: 0 }));
    const app = await openFinance('/finance?tab=reports&report=funnel&range=90');
    expect(await screen.findByRole('button', { name: '90 days' })).toHaveAttribute('aria-pressed', 'true');
    expect(asked[0].searchParams.get('days')).toBe('90');
    expect(await screen.findByText('900')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '7 days' }));
    expect(app.location()).toBe('/finance?tab=reports&report=funnel&range=7');
    await waitFor(() => expect(asked.at(-1)?.searchParams.get('days')).toBe('7'));
    expect(await screen.findByText('70')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '30 days' }));
    expect(app.location()).toBe('/finance?tab=reports&report=funnel');
  });

  it('says so when nobody reached any step in the period', async () => {
    serveFunnel((days) => ({ days, paymentStarted: 0, paid: 0, delivered: 0 }));
    await openFinance('/finance?tab=reports&report=funnel');
    expect(await screen.findByText('No activity in this period')).toBeInTheDocument();
  });

  it("shows the server's error with Retry and recovers", async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/reports/funnel', () =>
        HttpResponse.json(
          { title: 'Not allowed', status: 403, code: 'FORBIDDEN', detail: 'Reports are off for you.' },
          { status: 403, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    await openFinance('/finance?tab=reports&report=funnel');
    expect(await screen.findByText('Could not load the sales funnel')).toBeInTheDocument();
    expect(screen.getByText('Reports are off for you.')).toBeInTheDocument();
    serveFunnel((days) => ({ days, paymentStarted: 5, paid: 2, delivered: 1 }));
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Started a payment')).toBeInTheDocument();
  });

  it('works out the funnel from the mock tables by default', async () => {
    await openFinance('/finance?tab=reports&report=funnel');
    const list = await steps();
    expect(await list.findAllByRole('listitem')).toHaveLength(3);
    expect(list.getByText('Paid')).toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('offers profit and wallet exposure with reports:read, and not VAT', async () => {
    await openFinance('/finance?tab=reports&report=vat', { permissions: ['reports:read'] });
    await screen.findByRole('table', { name: 'Profit by day' });
    expect(
      reportSwitch()
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Profit', 'Wallet exposure']);
  });

  it('offers only VAT with reports:finance', async () => {
    await openFinance('/finance?tab=reports', { permissions: ['reports:finance'] });
    await screen.findByRole('table', { name: 'VAT by country' });
    expect(
      reportSwitch()
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['VAT']);
  });

  it('offers only the sales funnel with reports:growth', async () => {
    await openFinance('/finance?tab=reports', { permissions: ['reports:growth'] });
    await screen.findByRole('list', { name: /^Sales funnel, last \d+ days$/ });
    expect(
      reportSwitch()
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Sales funnel']);
  });
});
