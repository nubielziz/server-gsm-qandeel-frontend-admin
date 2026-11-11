// Tests for the Billing and Audit tabs of a merchant's page (feature 20), run through the whole app. This file answers
// `GET /admin/invoices`, `/admin/payments` and `/admin/audit-logs` itself (the mock layer of those features does not filter by the
// merchant's id), so each test sees the question the page asked the server and the answer it gets.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { financeInvoicePath, financePaymentPath } from '@/features/finance';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { installMerchantMocks } from '../test/installMerchantMocks';
import { openMerchant, sectionTabs, tableNamed } from '../test/openMerchants';

setupMockApi();
installMerchantMocks();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite
// runs in parallel. Every flow here also goes through the mock API with real dialogs, so give them room.
vi.setConfig({ testTimeout: 30_000 });

const ZAIN = /Zain Mobile Hub/;

// A page of a stub list: `total` rows exist, the request's `_start` and `_end` pick the page, `make` builds row n.
function listOf<T>(total: number, make: (n: number) => T, seen?: string[]) {
  return ({ request }: { request: Request }) => {
    const params = new URL(request.url).searchParams;
    seen?.push(`${params.toString()}`);
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

const payment = (n: number) => ({
  id: 500 + n,
  purpose: 'topup',
  status: 'approved',
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
  gateway: null,
  reviewedBy: null,
  reviewedAt: null,
  note: null,
  createdAt: new Date(Date.UTC(2026, 9, 20 - n)).toISOString(),
});

describe('Billing tab', () => {
  const openBilling = (permissions?: string[]) =>
    openMerchant(1, ZAIN, '?tab=billing', permissions ? { permissions } : {});

  it('asks the server for this merchant’s invoices and payments, ten a page, and links each row to Finance', async () => {
    const invoiceCalls: string[] = [];
    const paymentCalls: string[] = [];
    mockServer.use(
      http.get('*/admin/invoices', listOf(23, invoice, invoiceCalls)),
      http.get('*/admin/payments', listOf(4, payment, paymentCalls)),
    );
    await openBilling();
    const invoices = await tableNamed('Invoices');
    await waitFor(() => expect(invoices.getAllByRole('row')).toHaveLength(11));
    expect(invoices.getByRole('link', { name: 'INV-2026-0001' })).toHaveAttribute(
      'href',
      financeInvoicePath(101),
    );
    expect(invoices.getAllByText('Top-up').length).toBeGreaterThan(0);
    expect(invoices.getAllByText('Manual').length).toBeGreaterThan(0);
    expect(invoices.getAllByText('Paid').length).toBeGreaterThan(0);
    expect(await screen.findByText('1–10 of 23')).toBeInTheDocument();
    const payments = await tableNamed('Payments');
    await waitFor(() => expect(payments.getAllByRole('row')).toHaveLength(5));
    expect(payments.getByRole('link', { name: 'PAY-501' })).toHaveAttribute('href', financePaymentPath(501));
    expect(payments.getAllByText('Bank transfer').length).toBeGreaterThan(0);
    for (const call of [...invoiceCalls, ...paymentCalls]) {
      expect(call).toContain('clientId=1');
      expect(call).toContain('_start=0');
      expect(call).toContain('_end=10');
    }
  });

  it('reads the next page of invoices from where the last one ended', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    mockServer.use(
      http.get('*/admin/invoices', listOf(23, invoice, calls)),
      http.get('*/admin/payments', listOf(0, payment)),
    );
    await openBilling();
    await screen.findByText('1–10 of 23');
    const [next] = screen.getAllByRole('button', { name: 'Next page' });
    await user.click(next);
    expect(await screen.findByText('11–20 of 23')).toBeInTheDocument();
    expect(calls.at(-1)).toContain('_start=10');
  });

  it('says what an empty list is, in each section', async () => {
    mockServer.use(
      http.get('*/admin/invoices', listOf(0, invoice)),
      http.get('*/admin/payments', listOf(0, payment)),
    );
    await openBilling();
    expect(await screen.findByText('No invoices')).toBeInTheDocument();
    expect(await screen.findByText('No payments')).toBeInTheDocument();
  });

  it('shows an error with Retry in the section that failed, and leaves the other alone', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/invoices', () => HttpResponse.json({ title: 'Broken' }, { status: 400 })),
      http.get('*/admin/payments', listOf(1, payment)),
    );
    await openBilling();
    expect(await screen.findByText('Could not load the invoices')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'PAY-501' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Could not load the invoices')).toBeInTheDocument();
  });

  it('leaves out the section whose permission is missing, and asks nothing for it', async () => {
    let asked = false;
    mockServer.use(
      http.get('*/admin/invoices', () => {
        asked = true;
        return HttpResponse.json([]);
      }),
      http.get('*/admin/payments', listOf(1, payment)),
    );
    await openBilling(['clients:read', 'payments:read']);
    expect(await screen.findByRole('table', { name: 'Payments' })).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Invoices' })).not.toBeInTheDocument();
    expect(asked).toBe(false);
  });
});

const entry = (n: number) => ({
  id: n,
  actorType: n % 4 === 0 ? 'system' : 'staff',
  actorId: n % 4 === 0 ? null : 2,
  actorName: n % 4 === 0 ? null : 'Lina S.',
  action: n % 2 ? 'edited details of' : 'set a temporary password for',
  entityType: 'merchant',
  entityId: 1,
  entityLabel: 'Zain Mobile Hub',
  ip: n % 4 === 0 ? null : '198.51.100.77',
  createdAt: new Date(Date.UTC(2026, 9, 28, 12, 0) - n * 60_000).toISOString(),
});

describe('Audit tab', () => {
  const openAudit = (permissions?: string[]) =>
    openMerchant(1, ZAIN, '?tab=audit', permissions ? { permissions } : {});

  it('lists the entries about the merchant, who did what and from where, and asks for them by merchant', async () => {
    const calls: string[] = [];
    mockServer.use(http.get('*/admin/audit-logs', listOf(3, entry, calls)));
    await openAudit();
    const list = within(await screen.findByRole('list', { name: 'Audit entries' }));
    await waitFor(() => expect(list.getAllByRole('listitem')).toHaveLength(3));
    const first = list.getAllByRole('listitem')[0];
    expect(first).toHaveTextContent('Lina S. edited details of Zain Mobile Hub');
    expect(first).toHaveTextContent('198.51.100.77');
    expect(list.getAllByRole('listitem')[2]).toHaveTextContent('Lina S. edited details of Zain Mobile Hub');
    expect(calls[0]).toContain('entityType=merchant');
    expect(calls[0]).toContain('entityId=1');
    expect(calls[0]).toContain('_end=25');
    expect(calls[0]).toContain('_sort=createdAt');
    expect(calls[0]).toContain('_order=desc');
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });

  it('names the system when it made the change', async () => {
    mockServer.use(http.get('*/admin/audit-logs', listOf(4, entry)));
    await openAudit();
    const list = within(await screen.findByRole('list', { name: 'Audit entries' }));
    await waitFor(() => expect(list.getAllByRole('listitem')).toHaveLength(4));
    expect(list.getAllByRole('listitem')[3]).toHaveTextContent(
      'System set a temporary password for Zain Mobile Hub',
    );
  });

  it('shows 25 entries and gets the next ones with Show more', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    mockServer.use(http.get('*/admin/audit-logs', listOf(30, entry, calls)));
    await openAudit();
    const list = within(await screen.findByRole('list', { name: 'Audit entries' }));
    await waitFor(() => expect(list.getAllByRole('listitem')).toHaveLength(25));
    await user.click(screen.getByRole('button', { name: 'Show more' }));
    await waitFor(() => expect(list.getAllByRole('listitem')).toHaveLength(30));
    expect(calls.at(-1)).toContain('_end=50');
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });

  it('links to the audit log filtered to this merchant', async () => {
    mockServer.use(http.get('*/admin/audit-logs', listOf(1, entry)));
    await openAudit();
    expect(await screen.findByRole('link', { name: 'Open in the audit log' })).toHaveAttribute(
      'href',
      '/audit?type=merchant&record=1',
    );
  });

  it('says nothing was recorded, and shows an error with Retry', async () => {
    const user = userEvent.setup();
    mockServer.use(http.get('*/admin/audit-logs', listOf(0, entry)));
    await openAudit();
    expect(await screen.findByText('Nothing recorded yet')).toBeInTheDocument();
    mockServer.use(
      http.get('*/admin/audit-logs', () => HttpResponse.json({ title: 'Broken' }, { status: 400 })),
    );
    await user.click(sectionTabs().getByRole('tab', { name: 'Profile' }));
    await user.click(sectionTabs().getByRole('tab', { name: 'Audit' }));
    expect(await screen.findByText('Could not load the audit entries')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Could not load the audit entries')).toBeInTheDocument();
  });

  it('needs audit:read and is left out without it', async () => {
    await openAudit(['clients:read']);
    expect(sectionTabs().queryByRole('tab', { name: 'Audit' })).not.toBeInTheDocument();
  });
});
