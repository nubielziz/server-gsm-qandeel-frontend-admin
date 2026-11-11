// Tests for the customer page's tabs: the Wallet tab needs wallet:read, every other tab is open to anyone who sees the page, and an
// address that names a tab still names it (the page decides what to show).
import { describe, expect, it } from 'vitest';
import { customerPath, isDetailTab, visibleDetailTabs } from './detailTabs';

const ids = (granted: string[]) =>
  visibleDetailTabs((permission) => granted.includes(permission)).map((tab) => tab.id);

describe('visibleDetailTabs', () => {
  it('lists the Wallet tab after Account for a staff member with wallet:read', () => {
    expect(ids(['wallet:read'])).toEqual(['orders', 'account', 'wallet', 'support', 'consents', 'risk']);
  });

  it('leaves the Wallet tab out without wallet:read', () => {
    expect(ids([])).toEqual(['orders', 'account', 'support', 'consents', 'risk']);
  });
});

describe('addresses', () => {
  it('knows the wallet tab and writes its address', () => {
    expect(isDetailTab('wallet')).toBe(true);
    expect(customerPath(7, 'wallet')).toBe('/customers/7?tab=wallet');
    expect(customerPath(7)).toBe('/customers/7');
  });
});
