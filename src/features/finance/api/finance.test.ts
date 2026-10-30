// Tests for the finance API functions (trial balance, reconcile, payments, invoices, reports), run against the dev mock API:
// the shapes the screens rely on, the decisions on a deposit and what an approval changes in the books.
import { beforeEach, describe, expect, it } from 'vitest';
import { setupMockApi, signInAs } from '@/test/mockApi';
import {
  approvePayment,
  createInvoice,
  getInvoice,
  getPayment,
  getProfitReport,
  getTrialBalance,
  getVatReport,
  getWalletExposure,
  listInvoices,
  listLedgerTransactions,
  listPayments,
  reconcileLedger,
  rejectPayment,
} from '.';
import { listMerchantOptions } from './lookups';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});

const MONEY = /^-?\d+\.\d{4}$/;

describe('getTrialBalance', () => {
  it('sends one line per account kind and equal debit and credit totals', async () => {
    const trial = await getTrialBalance();
    expect(trial.rows.map((row) => row.kind)).toEqual(
      expect.arrayContaining(['bank', 'client_wallet', 'revenue']),
    );
    expect(trial.rows.every((row) => MONEY.test(row.balance))).toBe(true);
    expect(trial.totalDebit).toMatch(MONEY);
    expect(trial.totalDebit).toBe(trial.totalCredit);
    expect(trial.rows.find((row) => row.kind === 'client_wallet')?.accounts).toBeGreaterThan(5);
  });
});

describe('reconcileLedger', () => {
  it('answers what was checked and the accounts that differ', async () => {
    const result = await reconcileLedger();
    expect(result.accountsChecked).toBeGreaterThan(10);
    expect(result.entriesChecked).toBeGreaterThan(1000);
    expect(result.differences).toEqual([]);
  });
});

describe('payments', () => {
  it('lists the deposits by status with the total in x-total-count', async () => {
    const pending = await listPayments({ filters: { purpose: 'topup', status: 'pending' } });
    expect(pending.total).toBe(6);
    expect(pending.data.every((payment) => payment.status === 'pending')).toBe(true);
    const all = await listPayments({ filters: { purpose: 'topup' }, start: 0, end: 1 });
    expect(all.data).toHaveLength(1);
    expect(all.total).toBe(54);
  });

  it('reads one deposit with its merchant, fee and net amount, and answers 404 for one that does not exist', async () => {
    const payment = await getPayment(1048);
    expect(payment).toMatchObject({
      status: 'pending',
      methodType: 'usdt',
      amount: '2500.0000',
      feeAmount: '25.0000',
      netAmount: '2475.0000',
      client: { name: 'Phone Doctor FZE', group: 'VIP' },
    });
    expect(payment.client?.walletBalance).toMatch(MONEY);
    await expect(getPayment(999999)).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('approves a deposit: the wallet is credited, the entry is posted and the books still balance', async () => {
    const before = await getPayment(1048);
    const approved = await approvePayment(1048);
    expect(approved.status).toBe('approved');
    expect(approved.reviewedBy?.name).toBeTruthy();
    expect(Number(approved.client?.walletBalance)).toBeCloseTo(Number(before.client?.walletBalance) + 2475);

    const { data } = await listLedgerTransactions({ filters: { refType: 'payment', refId: 1048 } });
    expect(data).toHaveLength(1);
    expect(data[0].entries.reduce((sum, line) => sum + Number(line.amount), 0)).toBeCloseTo(0);
    const trial = await getTrialBalance();
    expect(trial.totalDebit).toBe(trial.totalCredit);
    expect((await listPayments({ filters: { purpose: 'topup', status: 'pending' } })).total).toBe(5);
  });

  it('refuses a second decision on the same deposit with the server’s message', async () => {
    await approvePayment(1048);
    await expect(approvePayment(1048)).rejects.toMatchObject({
      status: 409,
      code: 'PAYMENT_ALREADY_REVIEWED',
    });
    await expect(rejectPayment(1048, { reason: 'Too late' })).rejects.toMatchObject({ status: 409 });
  });

  it('rejects a deposit with a reason, and asks for one', async () => {
    await expect(rejectPayment(1049, { reason: '  ' })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { reason: [expect.any(String)] },
    });
    const rejected = await rejectPayment(1049, { reason: 'Payment not received in the bank account' });
    expect(rejected).toMatchObject({ status: 'rejected', note: 'Payment not received in the bank account' });
    expect((await listLedgerTransactions({ filters: { refType: 'payment', refId: 1049 } })).total).toBe(0);
  });
});

describe('invoices', () => {
  it('lists invoices of every kind, newest first, and finds one by its number', async () => {
    const page = await listInvoices({ start: 0, end: 10, sort: ['createdAt'], order: ['desc'] });
    expect(page.total).toBeGreaterThan(60);
    expect(new Set((await listInvoices({ start: 0, end: 100 })).data.map((invoice) => invoice.kind))).toEqual(
      new Set(['topup', 'manual', 'receipt']),
    );
    const found = await listInvoices({ q: page.data[0].number });
    expect(found.data.map((invoice) => invoice.id)).toContain(page.data[0].id);
  });

  it('issues a manual invoice for a merchant and reads it back', async () => {
    const { data: merchants } = await listMerchantOptions();
    const created = await createInvoice({
      clientId: merchants[0].id,
      amount: '125.5000',
      description: 'Setup fee',
    });
    expect(created).toMatchObject({
      kind: 'manual',
      status: 'open',
      total: '125.5000',
      description: 'Setup fee',
      client: { id: merchants[0].id },
    });
    expect(await getInvoice(created.id)).toMatchObject({ number: created.number });
  });

  it('shows the server’s message under the field it names', async () => {
    await expect(
      createInvoice({ clientId: 99999, amount: '0.0000', description: ' ' }),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: {
        clientId: [expect.any(String)],
        amount: [expect.any(String)],
        description: [expect.any(String)],
      },
    });
  });

  it('settles the top-up invoice of an approved deposit', async () => {
    const payment = await getPayment(1048);
    expect((await getInvoice(payment.invoiceId as number)).status).toBe('open');
    await approvePayment(1048);
    expect((await getInvoice(payment.invoiceId as number)).status).toBe('paid');
  });
});

describe('reports', () => {
  it('splits profit by day, and by merchant, with totals from the server', async () => {
    const to = new Date();
    const from = new Date(to.getFullYear(), to.getMonth(), to.getDate() - 29);
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const byDay = await getProfitReport({ groupBy: 'day', from: iso(from), to: iso(to) });
    expect(byDay.groupBy).toBe('day');
    expect(byDay.rows.length).toBeGreaterThan(5);
    expect(byDay.rows[0].key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number(byDay.totals.profit)).toBeCloseTo(
      Number(byDay.totals.revenue) - Number(byDay.totals.cost),
      2,
    );
    const byClient = await getProfitReport({ groupBy: 'client', from: iso(from), to: iso(to) });
    expect(byClient.totals.orders).toBe(byDay.totals.orders);
  });

  it('reports the wallets: balances, reserved and overdraft', async () => {
    const exposure = await getWalletExposure();
    expect(exposure.totals.clients).toBeGreaterThan(5);
    expect(exposure.rows[0]).toMatchObject({
      balance: expect.stringMatching(MONEY),
      reserved: expect.stringMatching(MONEY),
    });
    expect(Number(exposure.rows[0].balance)).toBeGreaterThanOrEqual(Number(exposure.rows[1].balance));
  });

  it('reports VAT by country and month', async () => {
    const vat = await getVatReport({ from: '2000-01-01', to: '2100-01-01' });
    expect(vat.rows.length).toBeGreaterThan(2);
    expect(vat.rows[0]).toMatchObject({
      country: expect.stringMatching(/^[A-Z]{2}$/),
      period: expect.stringMatching(/^\d{4}-\d{2}$/),
    });
    expect(vat.totals.orders).toBe(vat.rows.reduce((sum, row) => sum + row.orders, 0));
  });
});
