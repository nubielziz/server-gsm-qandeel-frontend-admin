// Tests for the finance addresses on the Money page: the old Finance tab names still open the right view, with the view's own parameters.
import { describe, expect, it } from 'vitest';
import { financeInvoicePath, financeJournalPath, financePath, financePaymentPath } from './tabs';

describe('financePath', () => {
  it('names the view in the address, the Ledger first', () => {
    expect(financePath()).toBe('/money?view=ledger');
    expect(financePath('ledger')).toBe('/money?view=ledger');
    expect(financePath('payments')).toBe('/money?view=deposits');
    expect(financePath('invoices')).toBe('/money?view=invoices');
  });

  it('calls the accounts tab the trial balance and the wallets tab Store balances', () => {
    expect(financePath('accounts')).toBe('/money?view=trial-balance');
    expect(financePath('wallets', { state: 'negative' })).toBe('/money?view=store-balances&state=negative');
  });

  it('opens a report by its name, and Profit when none is named', () => {
    expect(financePath('reports')).toBe('/money?view=profit');
    expect(financePath('reports', { report: 'vat', period: undefined })).toBe('/money?view=vat');
    expect(financePath('reports', { report: 'funnel', range: '7' })).toBe('/money?view=funnel&range=7');
  });

  it('adds the view’s own parameters and skips empty ones', () => {
    expect(financePath('ledger', { account: 'bank', q: '' })).toBe('/money?view=ledger&account=bank');
  });
});

describe('the record addresses', () => {
  it('open one deposit, journal entry or invoice', () => {
    expect(financePaymentPath(1048)).toBe('/money?view=deposits&status=all&payment=1048');
    expect(financeJournalPath(25)).toBe('/money?view=ledger&journal=25');
    expect(financeInvoicePath(7)).toBe('/money?view=invoices&invoice=7');
  });
});
