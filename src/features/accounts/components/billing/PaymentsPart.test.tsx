// Tests for the Payments part of an account's record, run through the whole app. The test answers `GET /admin/payments` itself (the mock layer of the
// finance feature does not filter by the account), so each test sees the question the part asked the server and the answer it gets.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { financePaymentPath } from '@/features/finance';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { partsMenu, renderAccount } from '../../pages/test-utils';
import { installAccountMocks } from '../../test/installAccountMocks';

setupMockApi();
installAccountMocks();
// The page is a lazy chunk and the first test of a run waits for its modules, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

const ZAIN = /Zain Mobile Hub/;
const SOFIA = /Sofia Alvarez/;

// A page of a stub list: `total` rows exist, the request's `_start` and `_end` pick the page, `make` builds row n.
function listOf<T>(total: number, make: (n: number) => T, seen?: string[]) {
  return ({ request }: { request: Request }) => {
    const params = new URL(request.url).searchParams;
    seen?.push(params.toString());
    const start = Number(params.get('_start') ?? 0);
    const end = Math.min(Number(params.get('_end') ?? total), total);
    const rows = Array.from({ length: Math.max(0, end - start) }, (_, index) => make(start + index + 1));
    return HttpResponse.json(rows, {
      headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
    });
  };
}

const payment = (n: number) => ({
  id: 500 + n,
  purpose: 'topup',
  status: n % 2 ? 'approved' : 'pending',
  methodType: 'bank',
  amount: `${n * 100}.0000`,
  feeAmount: '0.0000',
  netAmount: `${n * 100}.0000`,
  currency: 'USD',
  gatewayTxnId: null,
  capturedAt: null,
  invoiceId: null,
  receiptFileId: null,
  client: { id: 1, name: 'Zain Mobile Hub', group: 'VIP', walletBalance: null },
  customer: null,
  dispute: null,
  gateway: null,
  reviewedBy: null,
  reviewedAt: null,
  note: null,
  createdAt: new Date(Date.UTC(2026, 9, 20 - n)).toISOString(),
});

const openPayments = (id = 1, name: string | RegExp = ZAIN, permissions?: string[]) =>
  renderAccount(id, name, { tab: 'payments', ...(permissions ? { permissions } : {}) });
const table = () => screen.findByRole('table', { name: 'Payments' });

describe('the list', () => {
  it('asks the server for this account’s payments by accountId, newest first, and links each row to Finance', async () => {
    const calls: string[] = [];
    mockServer.use(http.get('*/admin/payments', listOf(4, payment, calls)));
    await openPayments();
    const view = within(await table());
    await waitFor(() => expect(view.getAllByRole('row')).toHaveLength(5));
    expect(view.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Payment',
      'Method',
      'Status',
      'Amount',
      'Created',
    ]);
    expect(view.getByRole('link', { name: 'PAY-501' })).toHaveAttribute('href', financePaymentPath(501));
    expect(view.getAllByText('Bank transfer').length).toBeGreaterThan(0);
    expect(view.getAllByText('Approved').length).toBeGreaterThan(0);
    expect(view.getAllByText('Pending').length).toBeGreaterThan(0);
    expect(view.getByText('$100.00')).toBeInTheDocument();
    expect(await screen.findByText('Results: 1 - 4 of 4')).toBeInTheDocument();
    for (const call of calls) {
      expect(call).toContain('accountId=1');
      expect(call).not.toContain('customerId');
      expect(call).toContain('_start=0');
      expect(call).toContain('_end=50');
      expect(call).toContain('_sort=createdAt');
      expect(call).toContain('_order=desc');
    }
  });

  it('is left out for a guest, who never tops up: the server lists wallet top-ups only, so the part would always be empty', async () => {
    let asked = false;
    mockServer.use(
      http.get('*/admin/payments', () => {
        asked = true;
        return HttpResponse.json([]);
      }),
    );
    await openPayments(102, SOFIA);
    expect(await partsMenu().findByRole('link', { name: 'Overview' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(partsMenu().queryByRole('link', { name: 'Payments' })).not.toBeInTheDocument();
    expect(asked).toBe(false);
  });

  it('reads the next page from where the last one ended', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    mockServer.use(http.get('*/admin/payments', listOf(75, payment, calls)));
    await openPayments();
    await screen.findByText('Results: 1 - 50 of 75');
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByText('Results: 51 - 75 of 75')).toBeInTheDocument();
    expect(calls.at(-1)).toContain('_start=50');
  });
});

describe('the states', () => {
  it('says what an empty list is', async () => {
    mockServer.use(http.get('*/admin/payments', listOf(0, payment)));
    await openPayments();
    expect(await screen.findByText('No payments')).toBeInTheDocument();
  });

  it('shows an error with Retry', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/payments', () => HttpResponse.json({ title: 'Broken' }, { status: 400 })),
    );
    await openPayments();
    expect(await screen.findByText('Could not load the payments')).toBeInTheDocument();
    mockServer.use(http.get('*/admin/payments', listOf(2, payment)));
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('link', { name: 'PAY-501' })).toBeInTheDocument();
  });
});

describe('who sees the part', () => {
  it('is left out of the menu without payments:read, and asks nothing', async () => {
    let asked = false;
    mockServer.use(
      http.get('*/admin/payments', () => {
        asked = true;
        return HttpResponse.json([]);
      }),
    );
    await openPayments(1, ZAIN, ['clients:read', 'invoices:read']);
    expect(partsMenu().queryByRole('link', { name: 'Payments' })).not.toBeInTheDocument();
    expect(partsMenu().getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(asked).toBe(false);
  });
});
