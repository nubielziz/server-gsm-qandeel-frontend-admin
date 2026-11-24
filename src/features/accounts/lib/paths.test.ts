// Tests for the address builders of the Accounts page: one record and its parts, the old-number links, and the list page with its keys in
// a fixed order and its defaults left out.
import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_TABS,
  accountPath,
  accountsListPath,
  DEFAULT_ACCOUNT_TAB,
  isAccountTab,
  legacyAccountPath,
  ranksPath,
} from './paths';

describe('the parts of a record', () => {
  it('names thirteen parts, the five new ones beside the eight of the first design', () => {
    expect(ACCOUNT_TABS).toEqual([
      'overview',
      'wallet',
      'profile',
      'invoices',
      'payments',
      'api',
      'security',
      'prices',
      'orders',
      'support',
      'statement',
      'privacy',
      'audit',
    ]);
    expect(DEFAULT_ACCOUNT_TAB).toBe('overview');
    for (const tab of ['profile', 'invoices', 'payments', 'api', 'statement'])
      expect(isAccountTab(tab)).toBe(true);
  });

  it('knows a part from a word in an address, and the retired ones are no parts', () => {
    expect(isAccountTab('wallet')).toBe(true);
    expect(isAccountTab('risk')).toBe(false);
    expect(isAccountTab('verification')).toBe(false);
    expect(isAccountTab(null)).toBe(false);
  });
});

describe('accountPath', () => {
  it('builds the address of an account, on a part when it is not the first', () => {
    expect(accountPath(7)).toBe('/accounts/7');
    expect(accountPath(7, 'overview')).toBe('/accounts/7');
    expect(accountPath(7, 'wallet')).toBe('/accounts/7?tab=wallet');
    expect(accountPath(7, 'privacy')).toBe('/accounts/7?tab=privacy');
  });

  it('adds the order of the drawer of the Orders part', () => {
    expect(accountPath(7, undefined, { order: 48100 })).toBe('/accounts/7?order=48100');
    expect(accountPath(7, 'orders', { order: 48100 })).toBe('/accounts/7?tab=orders&order=48100');
  });
});

describe('legacyAccountPath', () => {
  it('builds the address that makes the page ask which account an old record became', () => {
    expect(legacyAccountPath('customer', 5)).toBe('/accounts/5?from=customer');
    expect(legacyAccountPath('merchant', 12, 'wallet')).toBe('/accounts/12?from=merchant&tab=wallet');
    expect(legacyAccountPath('client', 3, 'overview')).toBe('/accounts/3?from=client');
  });
});

describe('accountsListPath', () => {
  it('is the plain page with no state, and with only defaults', () => {
    expect(accountsListPath()).toBe('/accounts');
    expect(accountsListPath({ chip: 'all', sort: 'name', page: 1, size: 50 })).toBe('/accounts');
    expect(accountsListPath({ view: 'all', dir: 'asc' })).toBe('/accounts');
  });

  it('writes the keys of the All view in the fixed order', () => {
    expect(
      accountsListPath({
        size: 100,
        page: 3,
        dir: 'desc',
        sort: 'balance',
        q: ' zain ',
        country: 'JO',
        rank: 3,
        status: 'suspended',
        chip: 'merchants',
      }),
    ).toBe(
      '/accounts?chip=merchants&status=suspended&rank=3&country=JO&q=zain&sort=balance&dir=desc&page=3&size=100',
    );
  });

  it('writes the other views and only the keys they use', () => {
    expect(ranksPath()).toBe('/accounts?view=ranks');
    expect(accountsListPath({ view: 'add' })).toBe('/accounts?view=add');
    expect(accountsListPath({ view: 'add-rank', q: 'x', page: 2 })).toBe('/accounts?view=add-rank');
    expect(accountsListPath({ view: 'edit-rank', id: 4, q: 'x' })).toBe('/accounts?view=edit-rank&id=4');
    expect(accountsListPath({ view: 'ranks', chip: 'guests', page: 2, size: 25 })).toBe(
      '/accounts?view=ranks&page=2&size=25',
    );
  });

  it('writes the Data requests view with its request filter, sort and page, leaving its default sort out', () => {
    expect(accountsListPath({ view: 'requests' })).toBe('/accounts?view=requests');
    expect(accountsListPath({ view: 'requests', request: 'any', sort: 'dueAt', page: 2 })).toBe(
      '/accounts?view=requests&page=2&request=any',
    );
    expect(
      accountsListPath({
        view: 'requests',
        sort: 'requestedAt',
        dir: 'desc',
        status: 'active',
        chip: 'retail',
      }),
    ).toBe('/accounts?view=requests&sort=requestedAt&dir=desc');
    // The keys come in the fixed order the builder documents, `request` last.
    expect(
      accountsListPath({ view: 'requests', request: 'completed', size: 25, dir: 'desc', sort: 'status' }),
    ).toBe('/accounts?view=requests&sort=status&dir=desc&size=25&request=completed');
  });

  it('builds the links other pages need: the search by email and the guests', () => {
    expect(accountsListPath({ q: 'a@b.example' })).toBe('/accounts?q=a%40b.example');
    expect(accountsListPath({ chip: 'guests', q: 'a@b.example' })).toBe(
      '/accounts?chip=guests&q=a%40b.example',
    );
    expect(accountsListPath({ chip: 'merchants', sort: 'balance', dir: 'asc' })).toBe(
      '/accounts?chip=merchants&sort=balance',
    );
    expect(accountsListPath({ rank: '2', status: 'blocked' })).toBe('/accounts?status=blocked&rank=2');
  });
});
