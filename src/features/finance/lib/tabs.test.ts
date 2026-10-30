// Tests for the Finance tabs: which ones a role may open, which one shows, and the addresses other pages link to.
import { describe, expect, it } from 'vitest';
import {
  financeInvoicePath,
  financeJournalPath,
  financePath,
  financePaymentPath,
  isFinanceTab,
  resolveTab,
  visibleTabs,
} from './tabs';

const ids = (granted: string[]) => visibleTabs(granted).map((tab) => tab.id);

describe('visibleTabs', () => {
  it('gives every tab to a role with everything', () => {
    expect(ids(['*'])).toEqual(['ledger', 'payments', 'accounts', 'invoices', 'reports']);
  });

  it('gives each tab only to the permission it needs', () => {
    expect(ids(['payments:read'])).toEqual(['payments']);
    expect(ids(['ledger:read'])).toEqual(['ledger', 'accounts']);
    expect(ids(['invoices:*'])).toEqual(['invoices']);
    expect(ids(['reports:finance'])).toEqual(['reports']);
    expect(ids(['orders:read'])).toEqual([]);
  });
});

describe('resolveTab', () => {
  const tabs = visibleTabs(['payments:read', 'invoices:read']);

  it('shows the tab in the address when the role may open it', () => {
    expect(resolveTab('invoices', tabs)).toBe('invoices');
  });

  it('falls back to the first tab the role may open', () => {
    expect(resolveTab('ledger', tabs)).toBe('payments');
    expect(resolveTab(null, tabs)).toBe('payments');
    expect(resolveTab('nonsense', tabs)).toBe('payments');
    expect(resolveTab('ledger', [])).toBeUndefined();
  });

  it('knows a tab id when it sees one', () => {
    expect(isFinanceTab('reports')).toBe(true);
    expect(isFinanceTab('withdrawals')).toBe(false);
    expect(isFinanceTab(null)).toBe(false);
  });
});

describe('addresses', () => {
  it('leaves the default tab out of the address', () => {
    expect(financePath()).toBe('/finance');
    expect(financePath('ledger')).toBe('/finance');
    expect(financePath('payments')).toBe('/finance?tab=payments');
  });

  it('adds the tab’s own parameters and skips empty ones', () => {
    expect(financePath('ledger', { account: 'bank', q: '' })).toBe('/finance?account=bank');
    expect(financePath('reports', { report: 'vat', period: undefined })).toBe(
      '/finance?tab=reports&report=vat',
    );
  });

  it('opens one record', () => {
    expect(financePaymentPath(1048)).toBe('/finance?tab=payments&status=all&payment=1048');
    expect(financeJournalPath(25)).toBe('/finance?journal=25');
    expect(financeInvoicePath(7)).toBe('/finance?tab=invoices&invoice=7');
  });
});
