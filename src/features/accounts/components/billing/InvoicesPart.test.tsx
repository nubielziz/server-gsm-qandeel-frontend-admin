// Tests for the Invoices part of an account's record, run through the whole app. The test answers `GET /admin/invoices` itself (the mock layer of the
// finance feature does not filter by the account), so each test sees the question the part asked the server and the answer it gets.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { financeInvoicePath } from '@/features/finance';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { partsMenu, renderAccount } from '../../pages/test-utils';
import { installAccountMocks } from '../../test/installAccountMocks';

setupMockApi();
installAccountMocks();
// The page is a lazy chunk and the first test of a run waits for its modules, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

const ZAIN = /Zain Mobile Hub/;

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

const invoice = (n: number) => ({
  id: 100 + n,
  number: `INV-2026-${String(n).padStart(4, '0')}`,
  kind: n % 2 ? 'topup' : 'manual',
  status: n % 3 === 0 ? 'paid' : 'open',
  amount: '100.0000',
  fee: '0.0000',
  netAmount: '100.0000',
  taxAmount: '0.0000',
  taxRate: '0.0000',
  taxCountry: null,
  customerVatId: null,
  total: `${n * 10}.0000`,
  dueAt: null,
  paidAt: null,
  createdAt: new Date(Date.UTC(2026, 9, 28 - n)).toISOString(),
  currency: 'USD',
  client: { id: 1, name: 'Zain Mobile Hub' },
  customer: null,
  orderId: null,
  pdfFileId: null,
  description: null,
});

const openInvoices = (permissions?: string[]) =>
  renderAccount(1, ZAIN, { tab: 'invoices', ...(permissions ? { permissions } : {}) });
const table = () => screen.findByRole('table', { name: 'Invoices' });

describe('the list', () => {
  it('asks the server for this account’s invoices, newest first, fifty a page, and links each row to Finance', async () => {
    const calls: string[] = [];
    mockServer.use(http.get('*/admin/invoices', listOf(23, invoice, calls)));
    await openInvoices();
    const view = within(await table());
    await waitFor(() => expect(view.getAllByRole('row')).toHaveLength(24));
    expect(view.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Number',
      'Kind',
      'Status',
      'Total',
      'Created',
    ]);
    expect(view.getByRole('link', { name: 'INV-2026-0001' })).toHaveAttribute(
      'href',
      financeInvoicePath(101),
    );
    expect(view.getAllByText('Top-up').length).toBeGreaterThan(0);
    expect(view.getAllByText('Manual').length).toBeGreaterThan(0);
    expect(view.getByText('$10.00')).toBeInTheDocument();
    expect(await screen.findByText('Results: 1 - 23 of 23')).toBeInTheDocument();
    for (const call of calls) {
      expect(call).toContain('accountId=1');
      expect(call).not.toContain('clientId');
      expect(call).toContain('_start=0');
      expect(call).toContain('_end=50');
      expect(call).toContain('_sort=createdAt');
      expect(call).toContain('_order=desc');
    }
  });

  it('shows each status as a square with its word: Open amber, Paid green', async () => {
    mockServer.use(http.get('*/admin/invoices', listOf(3, invoice)));
    await openInvoices();
    const view = within(await table());
    await waitFor(() => expect(view.getAllByRole('row')).toHaveLength(4));
    const [first, , third] = view.getAllByRole('row').slice(1);
    expect(within(first).getByText('Open')).toBeInTheDocument();
    expect(within(first).getByRole('img', { name: 'Open' })).toHaveClass('status-sq-warn');
    expect(within(third).getByText('Paid')).toBeInTheDocument();
    expect(within(third).getByRole('img', { name: 'Paid' })).toHaveClass('status-sq-ok');
  });

  it('shows a status it does not know as the server wrote it', async () => {
    mockServer.use(
      http.get(
        '*/admin/invoices',
        listOf(1, (n) => ({ ...invoice(n), status: 'refunded', kind: 'credit_note' })),
      ),
    );
    await openInvoices();
    const view = within(await table());
    expect(await view.findByText('refunded')).toBeInTheDocument();
    expect(view.getByText('credit_note')).toBeInTheDocument();
  });

  it('reads the next page from where the last one ended, and starts over when the size changes', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    mockServer.use(http.get('*/admin/invoices', listOf(123, invoice, calls)));
    await openInvoices();
    await screen.findByText('Results: 1 - 50 of 123');
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByText('Results: 51 - 100 of 123')).toBeInTheDocument();
    expect(calls.at(-1)).toContain('_start=50');
    await user.selectOptions(screen.getByLabelText('Page size:'), '25');
    expect(await screen.findByText('Results: 1 - 25 of 123')).toBeInTheDocument();
    expect(calls.at(-1)).toContain('_start=0');
    expect(calls.at(-1)).toContain('_end=25');
  });
});

describe('the states', () => {
  it('says what an empty list is', async () => {
    mockServer.use(http.get('*/admin/invoices', listOf(0, invoice)));
    await openInvoices();
    expect(await screen.findByText('No invoices for this account')).toBeInTheDocument();
  });

  it('shows an error with Retry', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/invoices', () => HttpResponse.json({ title: 'Broken' }, { status: 400 })),
    );
    await openInvoices();
    expect(await screen.findByText('Could not load the invoices')).toBeInTheDocument();
    mockServer.use(http.get('*/admin/invoices', listOf(2, invoice)));
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('link', { name: 'INV-2026-0001' })).toBeInTheDocument();
  });
});

describe('who sees the part', () => {
  it('is left out of the menu without invoices:read, and asks nothing', async () => {
    let asked = false;
    mockServer.use(
      http.get('*/admin/invoices', () => {
        asked = true;
        return HttpResponse.json([]);
      }),
    );
    await openInvoices(['clients:read', 'payments:read']);
    expect(partsMenu().queryByRole('link', { name: 'Invoices' })).not.toBeInTheDocument();
    expect(partsMenu().getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(asked).toBe(false);
  });

  it('is drawn for a guest, whose card orders have tax receipts, and reads by their account number', async () => {
    const calls: string[] = [];
    mockServer.use(http.get('*/admin/invoices', listOf(1, invoice, calls)));
    await renderAccount(102, /Sofia Alvarez/, { tab: 'invoices' });
    expect(partsMenu().getByRole('link', { name: 'Invoices' })).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByRole('link', { name: 'INV-2026-0001' })).toBeInTheDocument();
    expect(calls[0]).toContain('accountId=102');
  });
});
