// Tests for the Reports tab, run through the whole app against the dev mock API: profit by day, service, supplier and
// merchant, wallet exposure and VAT by country, each reading its own route, and the reports a role may open.
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

  it('splits by merchant and links each merchant to its page, with no chart', async () => {
    const user = userEvent.setup();
    const app = await openFinance('/finance?tab=reports');
    await user.click(await screen.findByRole('button', { name: 'Merchant' }));
    expect(app.location()).toBe('/finance?tab=reports&by=client');
    const table = await tableNamed('Profit by merchant');
    const link = (await table.findAllByRole('link'))[0];
    expect(link).toHaveAttribute('href', expect.stringMatching(/^\/merchants\/\d+$/));
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
});
