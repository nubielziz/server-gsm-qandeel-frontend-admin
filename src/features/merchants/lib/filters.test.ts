// Tests for the merchants page's address: the tab, the toolbar filters, the page and the sort, an old address that names a retired
// tab (Verification, Pending approval), and the API filters they become.
import { describe, expect, it } from 'vitest';
import {
  clearMerchantFilters,
  DEFAULT_SORT,
  hasActiveFilters,
  parseMerchantFilters,
  parseMerchantTab,
  parsePage,
  parseSort,
  toClientFilters,
  toRefineFilters,
  writeMerchantFilters,
  writeTab,
  writeView,
} from './filters';
import type { MerchantTab } from './status';

const params = (query: string) => new URLSearchParams(query);
const ALL: MerchantTab[] = ['all', 'active', 'suspended', 'groups'];

describe('parseMerchantTab', () => {
  it('opens the tab named in the address when the staff member may open it', () => {
    expect(parseMerchantTab(params('tab=suspended'), ALL)).toBe('suspended');
    expect(parseMerchantTab(params('tab=groups'), ALL)).toBe('groups');
  });

  it('falls back to the first tab they may open for an unknown, forbidden or missing tab', () => {
    expect(parseMerchantTab(params(''), ALL)).toBe('all');
    expect(parseMerchantTab(params('tab=bogus'), ALL)).toBe('all');
    expect(parseMerchantTab(params('tab=groups'), ['all', 'active'])).toBe('all');
    expect(parseMerchantTab(params('tab=all'), ['groups'])).toBe('groups');
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
    expect(clearMerchantFilters(params('tab=suspended&q=a&group=2&page=3')).toString()).toBe('tab=suspended');
  });
});

describe('writeTab', () => {
  it('drops the page and the sort, which belong to the tab being left', () => {
    const base = params('tab=suspended&page=3&sort=name&dir=desc&q=zain');
    expect(writeTab(base, 'groups').toString()).toBe('tab=groups&q=zain');
  });

  it('leaves no tab for All, the default', () => {
    expect(writeTab(params('tab=suspended&q=a'), 'all').toString()).toBe('q=a');
  });

  it('drops the parameters of the retired Verification tab, so an old link does not carry them on', () => {
    const base = params('tab=verification&kycStatus=approved&kyc=1&q=zain');
    expect(writeTab(base, 'active').toString()).toBe('tab=active&q=zain');
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

// The Verification tab was retired (MISMATCHES M278): a bookmark or a link that still names it must open the page, not fail.
describe('an old address that names the retired Verification tab', () => {
  it('opens the first tab, whatever the old parameters say', () => {
    expect(parseMerchantTab(params('tab=verification'), ALL)).toBe('all');
    expect(parseMerchantTab(params('tab=verification&kycStatus=approved&kyc=3'), ALL)).toBe('all');
    expect(parseMerchantTab(params('tab=verification'), ['groups'])).toBe('groups');
  });

  it('still reads the parameters that are still in use', () => {
    const old = params('tab=verification&kycStatus=all&kyc=5&q=zain&page=2');
    expect(parseMerchantFilters(old)).toEqual({ q: 'zain', group: '' });
    expect(parsePage(old)).toBe(2);
    expect(toClientFilters('all', parseMerchantFilters(old))).toEqual({ q: 'zain' });
  });
});

// The Pending approval tab was retired with the approval step: a bookmark or an older dashboard link that still names it must open
// the page, not fail.
describe('an old address that names the retired Pending approval tab', () => {
  it('opens the first tab', () => {
    expect(parseMerchantTab(params('tab=pending'), ALL)).toBe('all');
    expect(parseMerchantTab(params('tab=pending&q=zain&page=2'), ALL)).toBe('all');
    expect(parseMerchantTab(params('tab=pending'), ['groups'])).toBe('groups');
  });

  it('still reads the parameters that are still in use, and asks the server for no status', () => {
    const old = params('tab=pending&q=zain&group=3&page=2');
    expect(parseMerchantFilters(old)).toEqual({ q: 'zain', group: '3' });
    expect(parsePage(old)).toBe(2);
    const tab = parseMerchantTab(old, ALL) ?? 'all';
    expect(toClientFilters(tab, parseMerchantFilters(old))).toEqual({ groupId: 3, q: 'zain' });
  });

  it('is replaced by the tab the staff member picks next', () => {
    expect(writeTab(params('tab=pending&q=zain&page=2'), 'active').toString()).toBe('tab=active&q=zain');
    expect(writeTab(params('tab=pending&q=zain'), 'all').toString()).toBe('q=zain');
  });
});

describe('API filters', () => {
  it('maps the tab and the toolbar to the status, group and search the server filters by', () => {
    expect(toClientFilters('all', { q: '', group: '' })).toEqual({});
    expect(toClientFilters('suspended', { q: ' zain ', group: '3' })).toEqual({
      status: 'suspended',
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
