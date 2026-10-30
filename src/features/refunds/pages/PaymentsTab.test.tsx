// Tests for the Payments tab, run through the whole app against the dev mock API: the comparison of the payment methods, the
// storefront payments table with its method filter, paging and sorting in the address, and the empty and error states.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { money, money0, num, pct } from '@/lib/format';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { getPaymentsReport } from '../api';
import { openRefunds, rowWith, tableNamed } from '../test/refundsPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

const PAYMENTS = '/refunds?tab=payments';

describe('by payment method', () => {
  it('compares the three methods with the server’s volume, fees, fee rate, refunds and disputes', async () => {
    await openRefunds(PAYMENTS);
    const { methods } = await getPaymentsReport({ start: 0, end: 1 });
    const table = await tableNamed('Payment methods compared');
    const labels = { card: 'Card (3DS)', wallet: 'Apple / Google Pay', crypto: 'Crypto (USDT / BTC)' };
    expect(table.getAllByRole('row')).toHaveLength(4); // the header and three methods
    for (const row of methods) {
      const cells = within(table.getByText(labels[row.method]).closest('tr') as HTMLElement).getAllByRole(
        'cell',
      );
      expect(cells.map((cell) => cell.textContent)).toEqual([
        labels[row.method],
        num(row.payments),
        money0(row.volume),
        money(row.fees),
        pct(row.feeRate),
        num(row.refunds),
        num(row.disputes),
      ]);
    }
    for (const heading of [
      'Method',
      'Payments',
      'Volume',
      'Gateway fees',
      'Fee rate',
      'Refunds',
      'Disputes',
    ]) {
      expect(table.getByRole('columnheader', { name: heading })).toBeInTheDocument();
    }
  });
});

describe('storefront payments', () => {
  it('lists twelve payments at a time, newest first, and pages in the address', async () => {
    const user = userEvent.setup();
    const app = await openRefunds(PAYMENTS);
    const table = await tableNamed('Storefront payments');
    await screen.findByText('1–12 of 104');
    expect(table.getAllByRole('row')).toHaveLength(13);
    expect(screen.getByText('Page 1 of 9')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(app.location()).toBe('/refunds?tab=payments&page=2');
    expect(await screen.findByText('13–24 of 104')).toBeInTheDocument();
  });

  it('moves an address past the last page back to the last page that has rows', async () => {
    const app = await openRefunds('/refunds?tab=payments&page=99');
    expect(await screen.findByText('Page 9 of 9')).toBeInTheDocument();
    expect(app.location()).toBe('/refunds?tab=payments&page=9');
  });

  it('shows the order, customer, method, what was paid, the fee, the payment state and when', async () => {
    await openRefunds('/refunds?tab=payments&sort=orderId&dir=asc');
    const lost = await rowWith('Storefront payments', 'SF-20400');
    expect(lost.getByText('Jack Turner')).toBeInTheDocument();
    expect(lost.getByText('Card (3DS)')).toBeInTheDocument();
    expect(lost.getByText('Visa 4417')).toBeInTheDocument();
    expect(lost.getByText('£12.32')).toBeInTheDocument();
    expect(lost.getByText('$15.59')).toBeInTheDocument();
    expect(lost.getByText('$0.75')).toBeInTheDocument();
    expect(lost.getByText('Chargeback lost')).toBeInTheDocument();
    expect(lost.getByText(/ago$/)).toBeInTheDocument();
    expect((await rowWith('Storefront payments', 'SF-20403')).getByText('Disputed')).toBeInTheDocument();
    expect(
      (await rowWith('Storefront payments', 'SF-20403')).getByText('Crypto (USDT / BTC)'),
    ).toBeInTheDocument();
    expect((await rowWith('Storefront payments', 'SF-20402')).getByText('Paid')).toBeInTheDocument();
  });

  it('filters by method, keeps the comparison whole and writes the filter to the address', async () => {
    const user = userEvent.setup();
    const app = await openRefunds(PAYMENTS);
    await screen.findByText('1–12 of 104');
    await user.click(screen.getByRole('button', { name: 'Crypto' }));
    expect(app.location()).toBe('/refunds?tab=payments&method=crypto');
    expect(screen.getByRole('button', { name: 'Crypto' })).toHaveAttribute('aria-pressed', 'true');
    const crypto = await getPaymentsReport({ method: 'crypto', start: 0, end: 1 });
    await waitFor(async () => {
      const rows = (await tableNamed('Storefront payments')).getAllByRole('row').slice(1);
      expect(rows.length).toBe(Math.min(12, crypto.total));
      for (const row of rows) expect(row).toHaveTextContent('Crypto (USDT / BTC)');
    });
    expect((await tableNamed('Payment methods compared')).getAllByRole('row')).toHaveLength(4);

    await user.click(screen.getByRole('button', { name: 'All methods' }));
    expect(app.location()).toBe('/refunds?tab=payments');
    expect(await screen.findByText('1–12 of 104')).toBeInTheDocument();
  });

  it('goes back to the first page when the filter changes', async () => {
    const user = userEvent.setup();
    const app = await openRefunds('/refunds?tab=payments&page=3');
    await screen.findByText('25–36 of 104');
    await user.click(screen.getByRole('button', { name: 'Card' }));
    expect(app.location()).toBe('/refunds?tab=payments&method=card');
  });

  it('sorts on the server when a header is pressed', async () => {
    const user = userEvent.setup();
    const app = await openRefunds(PAYMENTS);
    await screen.findByText('1–12 of 104');
    await user.click(screen.getByRole('button', { name: 'Paid' }));
    expect(app.location()).toBe('/refunds?tab=payments&sort=amount&dir=asc');
    await waitFor(async () => {
      const first = (await tableNamed('Storefront payments')).getAllByRole('row')[1];
      expect(first).toHaveTextContent(/\$[0-4]\.\d\d/);
    });
  });
});

describe('empty and error states', () => {
  it('says so when there are no payments', async () => {
    mockServer.use(
      http.get('*/admin/reports/payments', () =>
        HttpResponse.json({
          methods: [],
          payments: [],
          total: 0,
          totals: {
            refundedCount: 0,
            refundedAmount: '0.0000',
            refundedPercentOfSales: '0',
            awaitingAmount: '0.0000',
            chargebackLoss: '0.0000',
          },
        }),
      ),
    );
    await openRefunds(PAYMENTS);
    expect(await screen.findByText('No payments')).toBeInTheDocument();
    expect(
      screen.getByText('Storefront payments appear here the moment they are captured.'),
    ).toBeInTheDocument();
  });

  it('shows what failed with its request id and a Retry that loads the report again', async () => {
    const user = userEvent.setup();
    // A 4xx is not retried by the query layer, so the error shows at once.
    let down = true;
    mockServer.use(
      http.get('*/admin/reports/payments', () =>
        down ? problem(400, 'BAD_REQUEST', 'The report is down', 'Try again in a minute.') : undefined,
      ),
    );
    await openRefunds(PAYMENTS);
    expect(await screen.findByText('Could not load payments')).toBeInTheDocument();
    expect(screen.getByText('Could not load the payment methods')).toBeInTheDocument();
    expect(
      screen.getAllByText(
        (_, element) => /^Request mock-req-\d+$/.test(element?.textContent ?? '') && element?.tagName === 'P',
      ).length,
    ).toBeGreaterThan(0);
    down = false;
    await user.click(screen.getAllByRole('button', { name: 'Retry' })[0]);
    expect(await screen.findByText('1–12 of 104')).toBeInTheDocument();
  });
});
