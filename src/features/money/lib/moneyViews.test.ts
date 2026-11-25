// Tests for the Money page's contract (lib/moneyViews.ts): which views each role may use, where an address that names a view the role cannot
// use falls back, the addresses of the views, and how the old Finance and "Refunds & disputes" addresses become Money addresses.
import { describe, expect, it } from 'vitest';
import {
  MONEY_AREAS,
  MONEY_HEADING,
  MONEY_PAGE_PERMISSIONS,
  MONEY_VIEWS,
  areaOf,
  canUseView,
  firstViewOf,
  isMoneyView,
  moneyPath,
  moneyPathOfFinance,
  moneyPathOfRefunds,
  resolveView,
  usableAreas,
  usableViews,
  viewOfFinanceTab,
  viewOfRefundTab,
  viewSpec,
} from './moneyViews';

const idsFor = (permissions: string[]) => usableViews(permissions).map((spec) => spec.id);
const search = (text: string) => new URLSearchParams(text);

describe('the views and tabs', () => {
  it('has the five tabs and the fourteen views in the order of their links', () => {
    expect(MONEY_AREAS.map((area) => area.label)).toEqual([
      'Overview',
      'Money in',
      'Money back',
      'Books',
      'Reports',
    ]);
    expect(MONEY_VIEWS.map((spec) => spec.id)).toEqual([
      'overview',
      'deposits',
      'shop-payments',
      'refunds',
      'disputes',
      'ledger',
      'trial-balance',
      'store-balances',
      'invoices',
      'issue-invoice',
      'profit',
      'exposure',
      'vat',
      'funnel',
    ]);
    expect(MONEY_HEADING).toBe('Money');
  });

  it('puts every view under a tab, and draws a plus only before Issue invoice', () => {
    for (const spec of MONEY_VIEWS) expect(MONEY_AREAS.some((area) => area.id === spec.area)).toBe(true);
    expect(MONEY_VIEWS.filter((spec) => spec.add).map((spec) => spec.id)).toEqual(['issue-invoice']);
    expect(areaOf('shop-payments')).toBe('in');
    expect(areaOf('disputes')).toBe('back');
    expect(areaOf('issue-invoice')).toBe('books');
    expect(areaOf('funnel')).toBe('reports');
  });

  it('knows its view ids', () => {
    expect(isMoneyView('vat')).toBe(true);
    expect(isMoneyView('nothing')).toBe(false);
    expect(isMoneyView(null)).toBe(false);
    expect(viewSpec('vat').label).toBe('VAT');
    // @ts-expect-error an id that is not a view
    expect(() => viewSpec('nothing')).toThrow('Unknown Money view');
  });

  it('opens the page with any one of its permissions, and each of them opens at least one view', () => {
    for (const permission of MONEY_PAGE_PERMISSIONS) expect(idsFor([permission]).length).toBeGreaterThan(0);
    expect(idsFor(['orders:read'])).toEqual([]);
  });
});

describe('usableViews and usableAreas', () => {
  it('gives the Owner every view and every tab', () => {
    expect(idsFor(['*'])).toHaveLength(14);
    expect(usableAreas(usableViews(['*'])).map((area) => area.id)).toEqual([
      'overview',
      'in',
      'back',
      'books',
      'reports',
    ]);
  });

  it('gives a finance clerk the books, the deposits and the Overview, but not Issue invoice', () => {
    expect(idsFor(['ledger:read', 'payments:read', 'invoices:read', 'wallet:read'])).toEqual([
      'overview',
      'deposits',
      'ledger',
      'trial-balance',
      'store-balances',
      'invoices',
    ]);
  });

  it('needs invoices:create and clients:read, besides invoices:read, for Issue invoice', () => {
    expect(idsFor(['invoices:read', 'invoices:create', 'clients:read'])).toEqual([
      'invoices',
      'issue-invoice',
    ]);
    expect(idsFor(['invoices:read', 'invoices:create'])).toEqual(['invoices']);
    expect(idsFor(['invoices:create', 'clients:read'])).toEqual([]);
  });

  it('gives each report the permission of its old tab', () => {
    expect(idsFor(['reports:read'])).toEqual(['overview', 'profit', 'exposure']);
    expect(idsFor(['reports:finance'])).toEqual(['overview', 'shop-payments', 'vat']);
    expect(idsFor(['reports:growth'])).toEqual(['funnel']);
  });

  it('gives a refunds role the Overview and Refunds, and a role that holds only wallet:read the store balances alone', () => {
    expect(idsFor(['refunds:read'])).toEqual(['overview', 'refunds']);
    expect(idsFor(['disputes:read'])).toEqual(['overview', 'disputes']);
    expect(idsFor(['wallet:read'])).toEqual(['store-balances']);
  });

  it('reads a wildcard of an area as every permission of it', () => {
    expect(idsFor(['payments:*'])).toEqual(['overview', 'deposits']);
    expect(canUseView(viewSpec('deposits'), ['payments:read'])).toBe(true);
    expect(canUseView(viewSpec('deposits'), ['payments:approve'])).toBe(false);
  });

  it('lists only the tabs that hold a usable view, and finds the first view of a tab', () => {
    const usable = usableViews(['reports:growth']);
    expect(usableAreas(usable).map((area) => area.id)).toEqual(['reports']);
    expect(firstViewOf('reports', usable)).toBe('funnel');
    expect(firstViewOf('books', usable)).toBeUndefined();
  });
});

describe('resolveView', () => {
  const owner = usableViews(['*']);

  it('shows a view the role may use, and the first one for nothing or an unknown word', () => {
    expect(resolveView('deposits', owner)).toBe('deposits');
    expect(resolveView('issue-invoice', owner)).toBe('issue-invoice');
    expect(resolveView(null, owner)).toBe('overview');
    expect(resolveView('nothing', owner)).toBe('overview');
    expect(resolveView('', owner)).toBe('overview');
  });

  it('falls back to the first view of the same tab the role may use', () => {
    expect(resolveView('vat', usableViews(['reports:read']))).toBe('profit');
    expect(resolveView('funnel', usableViews(['reports:read']))).toBe('profit');
    expect(resolveView('profit', usableViews(['reports:finance']))).toBe('vat');
    expect(resolveView('profit', usableViews(['reports:growth']))).toBe('funnel');
    expect(resolveView('ledger', usableViews(['invoices:read']))).toBe('invoices');
    expect(resolveView('issue-invoice', usableViews(['invoices:read']))).toBe('invoices');
  });

  it('falls back to the first view the role may use when its tab holds none', () => {
    expect(resolveView('deposits', usableViews(['refunds:read']))).toBe('overview');
    expect(resolveView('ledger', usableViews(['wallet:read', 'reports:growth']))).toBe('store-balances');
    expect(resolveView(null, usableViews(['wallet:read']))).toBe('store-balances');
  });

  it('gives null when the role may use no view', () => {
    expect(resolveView('deposits', usableViews(['orders:read']))).toBeNull();
    expect(resolveView(null, [])).toBeNull();
  });
});

describe('moneyPath', () => {
  it('is /money for the Overview and ?view= for every other view', () => {
    expect(moneyPath()).toBe('/money');
    expect(moneyPath('overview')).toBe('/money');
    expect(moneyPath('deposits')).toBe('/money?view=deposits');
    expect(moneyPath('issue-invoice')).toBe('/money?view=issue-invoice');
  });

  it('carries the parameters of the view after it, and leaves out the empty ones', () => {
    expect(moneyPath('deposits', { status: 'all', payment: 7 })).toBe(
      '/money?view=deposits&status=all&payment=7',
    );
    expect(moneyPath('ledger', { q: '', kind: undefined, page: null, journal: 0 })).toBe(
      '/money?view=ledger&journal=0',
    );
    expect(moneyPath('overview', { x: 1 })).toBe('/money?x=1');
  });

  it('never lets a parameter replace the view', () => {
    expect(moneyPath('vat', { view: 'profit', range: '30d' })).toBe('/money?view=vat&range=30d');
  });
});

describe('the old Finance tabs', () => {
  it('become the views the brief names', () => {
    expect(viewOfFinanceTab('ledger')).toBe('ledger');
    expect(viewOfFinanceTab('payments')).toBe('deposits');
    expect(viewOfFinanceTab('accounts')).toBe('trial-balance');
    expect(viewOfFinanceTab('wallets')).toBe('store-balances');
    expect(viewOfFinanceTab('invoices')).toBe('invoices');
  });

  it('send Reports to the report it names, and to Profit when it names none', () => {
    expect(viewOfFinanceTab('reports', 'vat')).toBe('vat');
    expect(viewOfFinanceTab('reports', 'exposure')).toBe('exposure');
    expect(viewOfFinanceTab('reports', 'funnel')).toBe('funnel');
    expect(viewOfFinanceTab('reports', 'profit')).toBe('profit');
    expect(viewOfFinanceTab('reports')).toBe('profit');
    expect(viewOfFinanceTab('reports', 'nope')).toBe('profit');
  });

  it('send no tab, or one that never existed, to the Ledger, and ignore the words every object has', () => {
    expect(viewOfFinanceTab(null)).toBe('ledger');
    expect(viewOfFinanceTab('withdrawals')).toBe('ledger');
    expect(viewOfFinanceTab('toString')).toBe('ledger');
    expect(viewOfFinanceTab('reports', '__proto__')).toBe('profit');
  });
});

describe('the old Refunds tabs', () => {
  it('become Refunds, Card disputes and Shop payments', () => {
    expect(viewOfRefundTab('refunds')).toBe('refunds');
    expect(viewOfRefundTab('disputes')).toBe('disputes');
    expect(viewOfRefundTab('payments')).toBe('shop-payments');
    expect(viewOfRefundTab(null)).toBe('refunds');
    expect(viewOfRefundTab('constructor')).toBe('refunds');
  });
});

describe('moneyPathOfFinance', () => {
  it('turns the tab into the view and carries every other key as it was', () => {
    expect(moneyPathOfFinance(search('tab=payments&status=all&payment=7'))).toBe(
      '/money?view=deposits&status=all&payment=7',
    );
    expect(moneyPathOfFinance(search('journal=5'))).toBe('/money?view=ledger&journal=5');
    expect(moneyPathOfFinance(search('tab=invoices&invoice=3&page=2'))).toBe(
      '/money?view=invoices&invoice=3&page=2',
    );
  });

  it('turns a report into its own view and drops the keys that named the old tab', () => {
    expect(moneyPathOfFinance(search('tab=reports&report=vat&range=30d'))).toBe('/money?view=vat&range=30d');
    expect(moneyPathOfFinance(search('tab=reports'))).toBe('/money?view=profit');
  });

  it('opens the Ledger for a bare address, and never keeps a view key of the old address', () => {
    expect(moneyPathOfFinance(search(''))).toBe('/money?view=ledger');
    expect(moneyPathOfFinance(search('view=zzz&tab=accounts'))).toBe('/money?view=trial-balance');
  });
});

describe('moneyPathOfRefunds', () => {
  it('turns the tab into the view and keeps the filters, the page and the sort', () => {
    expect(moneyPathOfRefunds(search('tab=disputes&status=needs_response&page=2'))).toBe(
      '/money?view=disputes&status=needs_response&page=2',
    );
    expect(moneyPathOfRefunds(search('status=requested'))).toBe('/money?view=refunds&status=requested');
    expect(moneyPathOfRefunds(search('tab=payments&method=card&sort=amount&dir=asc'))).toBe(
      '/money?view=shop-payments&method=card&sort=amount&dir=asc',
    );
  });
});
