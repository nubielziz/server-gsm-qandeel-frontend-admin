// Tests for the two rows of links under the Money heading: the strip of tabs with its counts, the tab that is raised, and the row of views of
// that tab (what a role sees, the plus before Issue invoice, no row on the Overview).
import { describe, expect, it } from 'vitest';
import { usableViews } from '../../lib/moneyViews';
import { countText, currentLink, moneyBackCount, stripCurrent, stripItems, viewItems } from './moneyNav';

const OWNER = usableViews(['*']);
const labels = (items: { label: string }[]) => items.map((item) => item.label);

describe('countText', () => {
  it('writes a count in brackets with thousands separators, and nothing at zero or while unknown', () => {
    expect(countText(3)).toBe(' (3)');
    expect(countText(1204)).toBe(' (1,204)');
    expect(countText(0)).toBe('');
    expect(countText(undefined)).toBe('');
  });
});

describe('moneyBackCount', () => {
  it('adds the refunds and the disputes that are known, and is unknown only when both are', () => {
    expect(moneyBackCount({ refunds: 1, disputes: 1 })).toBe(2);
    expect(moneyBackCount({ refunds: 4 })).toBe(4);
    expect(moneyBackCount({ disputes: 2 })).toBe(2);
    expect(moneyBackCount({ refunds: 0, disputes: 0 })).toBe(0);
    expect(moneyBackCount({ deposits: 9 })).toBeUndefined();
  });
});

describe('stripItems', () => {
  it('lists the five tabs, with the deposits on Money in and refunds plus disputes on Money back', () => {
    const items = stripItems(OWNER, { deposits: 3, refunds: 1, disputes: 1 });
    expect(labels(items)).toEqual(['Overview', 'Money in (3)', 'Money back (2)', 'Books', 'Reports']);
    expect(items.map((item) => item.id)).toEqual(['overview', 'in', 'back', 'books', 'reports']);
  });

  it('links each tab to its first view', () => {
    expect(stripItems(OWNER).map((item) => item.to)).toEqual([
      '/money',
      '/money?view=deposits',
      '/money?view=refunds',
      '/money?view=ledger',
      '/money?view=profit',
    ]);
  });

  it('leaves the number out at zero, while the counts load, and when there are none', () => {
    const plain = ['Overview', 'Money in', 'Money back', 'Books', 'Reports'];
    expect(labels(stripItems(OWNER, { deposits: 0, refunds: 0, disputes: 0 }))).toEqual(plain);
    expect(labels(stripItems(OWNER, {}))).toEqual(plain);
    expect(labels(stripItems(OWNER))).toEqual(plain);
    expect(stripItems(OWNER, { deposits: 1204 })[1]?.label).toBe('Money in (1,204)');
  });

  it('draws only the tabs a role may use, each linked to its first usable view', () => {
    const items = stripItems(usableViews(['disputes:read', 'invoices:read']), { disputes: 2 });
    expect(labels(items)).toEqual(['Overview', 'Money back (2)', 'Books']);
    expect(items.map((item) => item.to)).toEqual(['/money', '/money?view=disputes', '/money?view=invoices']);
    expect(labels(stripItems(usableViews(['reports:growth'])))).toEqual(['Reports']);
    expect(stripItems(usableViews(['orders:read']))).toEqual([]);
  });
});

describe('stripCurrent and currentLink', () => {
  it('raise the tab of the view on screen, and underline the view', () => {
    expect(stripCurrent('overview')).toBe('overview');
    expect(stripCurrent('shop-payments')).toBe('in');
    expect(stripCurrent('disputes')).toBe('back');
    expect(stripCurrent('issue-invoice')).toBe('books');
    expect(stripCurrent('funnel')).toBe('reports');
    expect(currentLink('vat')).toBe('vat');
  });
});

describe('viewItems', () => {
  it('draws no row on the Overview', () => {
    expect(viewItems(OWNER, 'overview', { deposits: 3 })).toEqual([]);
  });

  it('lists Money in with the deposits to review on Deposits', () => {
    const items = viewItems(OWNER, 'deposits', { deposits: 3 });
    expect(labels(items)).toEqual(['Deposits (3)', 'Shop payments']);
    expect(items.map((item) => item.to)).toEqual(['/money?view=deposits', '/money?view=shop-payments']);
    expect(viewItems(OWNER, 'shop-payments').map((item) => item.id)).toEqual(['deposits', 'shop-payments']);
  });

  it('lists Money back with the refunds and the disputes each on its own link', () => {
    expect(labels(viewItems(OWNER, 'refunds', { refunds: 1, disputes: 5 }))).toEqual([
      'Refunds (1)',
      'Card disputes (5)',
    ]);
    expect(labels(viewItems(OWNER, 'disputes', { refunds: 0 }))).toEqual(['Refunds', 'Card disputes']);
  });

  it('lists Books with a plus before Issue invoice, which is a view of the Books tab like the others', () => {
    const items = viewItems(OWNER, 'ledger');
    expect(labels(items)).toEqual(['Ledger', 'Trial balance', 'Store balances', 'Invoices', 'Issue invoice']);
    expect(items.map((item) => item.add)).toEqual([undefined, undefined, undefined, undefined, true]);
    expect(items.at(-1)?.to).toBe('/money?view=issue-invoice');
    expect(labels(viewItems(OWNER, 'issue-invoice'))).toEqual(labels(items));
  });

  it('lists Reports', () => {
    expect(labels(viewItems(OWNER, 'profit'))).toEqual(['Profit', 'Wallet exposure', 'VAT', 'Sales funnel']);
    expect(viewItems(OWNER, 'funnel').map((item) => item.to)).toEqual([
      '/money?view=profit',
      '/money?view=exposure',
      '/money?view=vat',
      '/money?view=funnel',
    ]);
  });

  it('leaves out the views a role may not use', () => {
    expect(labels(viewItems(usableViews(['ledger:read']), 'ledger'))).toEqual(['Ledger', 'Trial balance']);
    const issuer = usableViews(['invoices:read', 'invoices:create', 'clients:read']);
    expect(labels(viewItems(issuer, 'invoices'))).toEqual(['Invoices', 'Issue invoice']);
    expect(labels(viewItems(usableViews(['invoices:read', 'invoices:create']), 'invoices'))).toEqual([
      'Invoices',
    ]);
    expect(labels(viewItems(usableViews(['reports:read']), 'profit'))).toEqual(['Profit', 'Wallet exposure']);
  });
});
