// Tests for the list's address state and how it becomes API filters: tab, search, country, page and sort in the URL, the
// tab each sort applies to, and the filters, Refine filters and list query behind a tab.
import { describe, expect, it } from 'vitest';
import {
  clearCustomerFilters,
  customersListPath,
  defaultSort,
  hasActiveFilters,
  parseCustomerFilters,
  parsePage,
  parseSort,
  REQUEST_STATUS_OPTIONS,
  requestFilters,
  tabFilters,
  toListFilters,
  toListQuery,
  toRefineFilters,
  writeCustomerFilters,
  writeView,
  type CustomerFilters,
} from './filters';

const params = (query: string) => new URLSearchParams(query);

describe('parseCustomerFilters', () => {
  it('starts on All with nothing filtered', () => {
    expect(parseCustomerFilters(params(''))).toEqual({ tab: 'all', q: '', country: '', status: '' });
  });

  it('reads the tab, the search text, the country and the request status', () => {
    expect(parseCustomerFilters(params('tab=flagged&q=ann&country=gb'))).toEqual({
      tab: 'flagged',
      q: 'ann',
      country: 'GB',
      status: '',
    });
    expect(parseCustomerFilters(params('tab=requests')).tab).toBe('requests');
    for (const status of ['open', 'in_progress', 'completed', 'rejected', 'all']) {
      expect(parseCustomerFilters(params(`tab=requests&status=${status}`)).status).toBe(status);
    }
  });

  it('drops a tab, country or status it does not know', () => {
    expect(parseCustomerFilters(params('tab=nope&country=Germany&status=archived'))).toEqual({
      tab: 'all',
      q: '',
      country: '',
      status: '',
    });
  });
});

describe('writeCustomerFilters', () => {
  it('leaves defaults out, so a clean address means "all customers"', () => {
    expect(writeCustomerFilters(params('tab=blocked&q=x'), { tab: 'all', q: '' }).toString()).toBe('');
    expect(writeCustomerFilters(params(''), { tab: 'flagged', country: 'DE' }).toString()).toBe(
      'tab=flagged&country=DE',
    );
  });

  it('keeps the other parameters, such as the page', () => {
    expect(writeCustomerFilters(params('page=3&q=a'), { country: 'GB' }).toString()).toBe(
      'page=3&q=a&country=GB',
    );
  });

  it('keeps the search text and the country in the address when the Data requests tab opens', () => {
    expect(writeCustomerFilters(params('q=ann&country=GB'), { tab: 'requests' }).toString()).toBe(
      'q=ann&country=GB&tab=requests',
    );
  });

  it('keeps the request status only while the Data requests tab is open', () => {
    expect(writeCustomerFilters(params('tab=requests'), { status: 'all' }).toString()).toBe(
      'tab=requests&status=all',
    );
    expect(writeCustomerFilters(params('tab=requests&status=all'), { status: '' }).toString()).toBe(
      'tab=requests',
    );
    // Leaving the tab drops the status; a status on any other tab is not kept.
    expect(writeCustomerFilters(params('tab=requests&status=completed'), { tab: 'blocked' }).toString()).toBe(
      'tab=blocked',
    );
    expect(writeCustomerFilters(params('status=open'), { q: 'a' }).toString()).toBe('q=a');
  });

  it('drops a sort the new tab does not offer, and keeps one it does', () => {
    expect(writeCustomerFilters(params('sort=totalSpent&dir=asc'), { tab: 'requests' }).toString()).toBe(
      'tab=requests',
    );
    expect(
      writeCustomerFilters(params('tab=requests&sort=dueAt&dir=asc'), { tab: 'requests' }).toString(),
    ).toBe('tab=requests&sort=dueAt&dir=asc');
    expect(writeCustomerFilters(params('sort=name&dir=asc'), { tab: 'blocked' }).toString()).toBe(
      'sort=name&dir=asc&tab=blocked',
    );
  });
});

describe('filters on and cleared', () => {
  const filters = (patch: Partial<CustomerFilters>): CustomerFilters => ({
    tab: 'all',
    q: '',
    country: '',
    status: '',
    ...patch,
  });

  it('counts the search text (trimmed) and the country, not the tab', () => {
    expect(hasActiveFilters(filters({ tab: 'blocked' }))).toBe(false);
    expect(hasActiveFilters(filters({ q: '  ' }))).toBe(false);
    expect(hasActiveFilters(filters({ q: 'a' }))).toBe(true);
    expect(hasActiveFilters(filters({ country: 'GB' }))).toBe(true);
  });

  it('clears the toolbar filters and the page, and keeps the tab and the sort', () => {
    expect(
      clearCustomerFilters(params('tab=active&q=a&country=GB&page=2&sort=name&dir=asc')).toString(),
    ).toBe('tab=active&sort=name&dir=asc');
  });
});

describe('page and sort', () => {
  it('reads the page, 1 when missing or malformed', () => {
    expect(parsePage(params('page=4'))).toBe(4);
    expect(parsePage(params('page=0'))).toBe(1);
    expect(parsePage(params('page=-2'))).toBe(1);
    expect(parsePage(params('page=abc'))).toBe(1);
    expect(parsePage(params(''))).toBe(1);
  });

  it('starts customers by spend, biggest first, and requests by their deadline, nearest first', () => {
    expect(defaultSort('all')).toEqual({ field: 'totalSpent', order: 'desc' });
    expect(defaultSort('blocked')).toEqual({ field: 'totalSpent', order: 'desc' });
    expect(defaultSort('requests')).toEqual({ field: 'dueAt', order: 'asc' });
    expect(parseSort(params(''))).toEqual({ field: 'totalSpent', order: 'desc' });
    expect(parseSort(params('tab=requests'))).toEqual({ field: 'dueAt', order: 'asc' });
  });

  it('reads the sort of each tab and ignores one the tab does not offer', () => {
    expect(parseSort(params('sort=name&dir=asc'))).toEqual({ field: 'name', order: 'asc' });
    expect(parseSort(params('sort=ordersCount'))).toEqual({ field: 'ordersCount', order: 'desc' });
    expect(parseSort(params('tab=requests&sort=requestedAt&dir=desc'))).toEqual({
      field: 'requestedAt',
      order: 'desc',
    });
    expect(parseSort(params('tab=requests&sort=name&dir=desc'))).toEqual({ field: 'dueAt', order: 'asc' });
    expect(parseSort(params('sort=password'))).toEqual({ field: 'totalSpent', order: 'desc' });
  });

  it('writes the page and sort, leaving out the defaults', () => {
    expect(writeView(params(''), { page: 3 }).toString()).toBe('page=3');
    expect(writeView(params('page=3'), { page: 1 }).toString()).toBe('');
    expect(writeView(params(''), { sort: { field: 'name', order: 'asc' } }).toString()).toBe(
      'sort=name&dir=asc',
    );
    expect(
      writeView(params('sort=name&dir=asc'), { sort: { field: 'totalSpent', order: 'desc' } }).toString(),
    ).toBe('');
    expect(writeView(params('tab=requests'), { sort: { field: 'dueAt', order: 'asc' } }).toString()).toBe(
      'tab=requests',
    );
    expect(writeView(params('tab=requests'), { sort: { field: 'dueAt', order: 'desc' } }).toString()).toBe(
      'tab=requests&sort=dueAt&dir=desc',
    );
  });

  it('builds the address of a filtered list for links from other pages', () => {
    expect(customersListPath()).toBe('/customers');
    expect(customersListPath({ tab: 'flagged' })).toBe('/customers?tab=flagged');
    expect(customersListPath({ tab: 'all', q: 'ann' })).toBe('/customers?q=ann');
    expect(customersListPath({ tab: 'requests', status: 'all' })).toBe('/customers?tab=requests&status=all');
  });
});

describe('what each tab asks the server', () => {
  it('maps the tabs to filters: Flagged is every level above low', () => {
    expect(tabFilters('all')).toEqual({});
    expect(tabFilters('requests')).toEqual({});
    expect(tabFilters('active')).toEqual({ status: 'active' });
    expect(tabFilters('suspended')).toEqual({ status: 'suspended' });
    expect(tabFilters('blocked')).toEqual({ status: 'blocked' });
    expect(tabFilters('flagged')).toEqual({ riskLevel: ['medium', 'high'] });
  });

  it('adds the trimmed search text and the country to the tab', () => {
    expect(toListFilters({ tab: 'flagged', q: '  ann  ', country: 'GB', status: '' })).toEqual({
      riskLevel: ['medium', 'high'],
      q: 'ann',
      country: 'GB',
    });
    expect(toListFilters({ tab: 'all', q: '   ', country: '', status: '' })).toEqual({});
  });

  it('maps the status menu of the Data requests tab: open and in progress by default, no filter for all', () => {
    expect(REQUEST_STATUS_OPTIONS.map((option) => option.label)).toEqual([
      'Open and in progress',
      'Open',
      'In progress',
      'Done',
      'Rejected',
      'All statuses',
    ]);
    expect(requestFilters('')).toEqual({ status: ['open', 'in_progress'] });
    expect(requestFilters('open')).toEqual({ status: 'open' });
    expect(requestFilters('completed')).toEqual({ status: 'completed' });
    expect(requestFilters('all')).toEqual({});
  });

  it('turns filters into Refine filters: an array is "in", the search text is its own field', () => {
    expect(
      toRefineFilters({
        q: 'ann',
        country: 'GB',
        riskLevel: ['medium', 'high'],
        hasAccount: true,
        status: [],
      }),
    ).toEqual([
      { field: 'q', operator: 'eq', value: 'ann' },
      { field: 'country', operator: 'eq', value: 'GB' },
      { field: 'riskLevel', operator: 'in', value: ['medium', 'high'] },
      { field: 'hasAccount', operator: 'eq', value: true },
    ]);
    expect(toRefineFilters({ customerId: 4, status: ['open', 'in_progress'] })).toEqual([
      { field: 'customerId', operator: 'eq', value: 4 },
      { field: 'status', operator: 'in', value: ['open', 'in_progress'] },
    ]);
  });

  it('turns filters into a list query with the text apart and the rest as field filters', () => {
    expect(toListQuery({ q: 'ann', status: 'active', hasAccount: false }, { start: 0, end: 1 })).toEqual({
      start: 0,
      end: 1,
      q: 'ann',
      filters: { status: 'active', hasAccount: false },
    });
    expect(toListQuery({})).toEqual({ filters: {} });
  });
});
