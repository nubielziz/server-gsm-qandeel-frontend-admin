// Tests for the merchants page's address: the tab, the toolbar filters, the page, the sort and the verification filter, and the
// API filters they become.
import { describe, expect, it } from 'vitest';
import {
  clearMerchantFilters,
  DEFAULT_SORT,
  hasActiveFilters,
  parseKycFilter,
  parseMerchantFilters,
  parseMerchantTab,
  parsePage,
  parseSort,
  toClientFilters,
  toRefineFilters,
  writeKycFilter,
  writeMerchantFilters,
  writeTab,
  writeView,
} from './filters';
import type { MerchantTab } from './status';

const params = (query: string) => new URLSearchParams(query);
const ALL: MerchantTab[] = ['all', 'active', 'pending', 'suspended', 'groups', 'verification'];

describe('parseMerchantTab', () => {
  it('opens the tab named in the address when the staff member may open it', () => {
    expect(parseMerchantTab(params('tab=pending'), ALL)).toBe('pending');
    expect(parseMerchantTab(params('tab=verification'), ALL)).toBe('verification');
  });

  it('falls back to the first tab they may open for an unknown, forbidden or missing tab', () => {
    expect(parseMerchantTab(params(''), ALL)).toBe('all');
    expect(parseMerchantTab(params('tab=bogus'), ALL)).toBe('all');
    expect(parseMerchantTab(params('tab=groups'), ['all', 'active'])).toBe('all');
    expect(parseMerchantTab(params('tab=all'), ['verification'])).toBe('verification');
  });

  it('gives no tab to a role that may open none', () => {
    expect(parseMerchantTab(params('tab=all'), [])).toBeUndefined();
  });
});

describe('filters in the address', () => {
  it('reads the search text and a numeric group, and drops anything else', () => {
    expect(parseMerchantFilters(params('q=zain&group=3'))).toEqual({ q: 'zain', group: '3' });
    expect(parseMerchantFilters(params('group=abc'))).toEqual({ q: '', group: '' });
  });

  it('writes only the filters that are set and keeps the rest of the address', () => {
    const next = writeMerchantFilters(params('tab=active&page=2'), { q: 'zain', group: '3' });
    expect(next.toString()).toBe('tab=active&page=2&q=zain&group=3');
    expect(writeMerchantFilters(next, { q: '' }).toString()).toBe('tab=active&page=2&group=3');
  });

  it('knows when a filter is on (the tab does not count) and clears them with the page, keeping the tab', () => {
    expect(hasActiveFilters({ q: '  ', group: '' })).toBe(false);
    expect(hasActiveFilters({ q: 'a', group: '' })).toBe(true);
    expect(hasActiveFilters({ q: '', group: '2' })).toBe(true);
    expect(clearMerchantFilters(params('tab=pending&q=a&group=2&page=3')).toString()).toBe('tab=pending');
  });
});

describe('writeTab', () => {
  it('drops the page, the sort and the open request, which belong to the tab being left', () => {
    const base = params('tab=pending&page=3&sort=name&dir=desc&kyc=5&kycStatus=all&q=zain');
    expect(writeTab(base, 'groups').toString()).toBe('tab=groups&q=zain');
  });

  it('leaves no tab for All, the default', () => {
    expect(writeTab(params('tab=pending&q=a'), 'all').toString()).toBe('q=a');
  });
});

describe('page and sort', () => {
  it('reads a page of 1 or more and sorts by the columns the server can sort', () => {
    expect(parsePage(params('page=3'))).toBe(3);
    expect(parsePage(params('page=0'))).toBe(1);
    expect(parsePage(params('page=x'))).toBe(1);
    expect(parseSort(params('sort=status&dir=desc'))).toEqual({ field: 'status', order: 'desc' });
    expect(parseSort(params('sort=name'))).toEqual({ field: 'name', order: 'asc' });
  });

  it('falls back to alphabetical for a column the server cannot sort by', () => {
    expect(parseSort(params('sort=spend&dir=desc'))).toEqual(DEFAULT_SORT);
    expect(parseSort(params(''))).toEqual({ field: 'name', order: 'asc' });
  });

  it('leaves the first page and the default sort out of the address', () => {
    expect(writeView(params('page=2'), { page: 1 }).toString()).toBe('');
    expect(writeView(params(''), { page: 4 }).toString()).toBe('page=4');
    expect(writeView(params(''), { sort: { field: 'status', order: 'desc' } }).toString()).toBe(
      'sort=status&dir=desc',
    );
    expect(writeView(params('sort=status&dir=desc'), { sort: DEFAULT_SORT }).toString()).toBe('');
  });
});

describe('verification filter', () => {
  it('opens on the pending requests and names any other status in the address', () => {
    expect(parseKycFilter(params(''))).toBe('pending');
    expect(parseKycFilter(params('kycStatus=approved'))).toBe('approved');
    expect(parseKycFilter(params('kycStatus=bogus'))).toBe('pending');
    expect(writeKycFilter(params('page=3'), 'rejected').toString()).toBe('kycStatus=rejected');
    expect(writeKycFilter(params('kycStatus=all&page=2'), 'pending').toString()).toBe('');
  });
});

describe('API filters', () => {
  it('maps the tab and the toolbar to the status, group and search the server filters by', () => {
    expect(toClientFilters('all', { q: '', group: '' })).toEqual({});
    expect(toClientFilters('pending', { q: ' zain ', group: '3' })).toEqual({
      status: 'pending',
      groupId: 3,
      q: 'zain',
    });
    expect(toClientFilters('groups', { q: '', group: '' })).toEqual({});
  });

  it('turns them into Refine filters, leaving out empty values', () => {
    expect(toRefineFilters({ status: 'active', groupId: 2, q: '' })).toEqual([
      { field: 'status', operator: 'eq', value: 'active' },
      { field: 'groupId', operator: 'eq', value: 2 },
    ]);
  });
});
