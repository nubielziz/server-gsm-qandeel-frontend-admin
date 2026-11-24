// Tests for the address of the Data requests view and how it becomes the question the server is asked: the status menu (open and in progress
// by default, so the table matches the number on the link), the deadline sort, the page and the size, and the menu's words. Ports the
// request cases of the old customers list's filter tests.
import { describe, expect, it } from 'vitest';
import { accountsListPath } from '../../lib/paths';
import {
  DEFAULT_REQUEST_SORT,
  EMPTY_REQUESTS_ADDRESS,
  parseRequestsAddress,
  REQUEST_STATUS_OPTIONS,
  requestFilters,
  requestsLink,
} from './requestsAddress';

const params = (query: string) => new URLSearchParams(query);

describe('parseRequestsAddress', () => {
  it('starts on open and in progress, by the deadline, nearest first, on the first page of fifty', () => {
    expect(parseRequestsAddress(params('view=requests'))).toEqual(EMPTY_REQUESTS_ADDRESS);
    expect(EMPTY_REQUESTS_ADDRESS).toEqual({ request: '', sort: 'dueAt', dir: 'asc', page: 1, size: 50 });
    expect(DEFAULT_REQUEST_SORT).toBe('dueAt');
  });

  it('reads each status of the menu, and "any" for all statuses', () => {
    for (const request of ['open', 'in_progress', 'completed', 'rejected', 'any']) {
      expect(parseRequestsAddress(params(`request=${request}`)).request).toBe(request);
    }
  });

  it('drops a status, sort, size or page it does not know and keeps the rest', () => {
    expect(parseRequestsAddress(params('request=archived&sort=name&dir=desc&size=7&page=0&q=ann'))).toEqual({
      ...EMPTY_REQUESTS_ADDRESS,
    });
    expect(parseRequestsAddress(params('request=any&page=abc')).page).toBe(1);
    expect(parseRequestsAddress(params('page=-2')).page).toBe(1);
  });

  it('reads the sort of this view and its direction, and the page and the size the footer offers', () => {
    expect(parseRequestsAddress(params('sort=requestedAt&dir=desc'))).toMatchObject({
      sort: 'requestedAt',
      dir: 'desc',
    });
    expect(parseRequestsAddress(params('sort=status'))).toMatchObject({ sort: 'status', dir: 'asc' });
    expect(parseRequestsAddress(params('dir=desc'))).toMatchObject({ sort: 'dueAt', dir: 'desc' });
    expect(parseRequestsAddress(params('page=4&size=100'))).toMatchObject({ page: 4, size: 100 });
  });

  it('gives a sort of another view the default order, direction included', () => {
    expect(parseRequestsAddress(params('sort=balance&dir=desc'))).toMatchObject({
      sort: 'dueAt',
      dir: 'asc',
    });
  });
});

describe('requestsLink', () => {
  it('writes the plain view for the defaults', () => {
    expect(requestsLink()).toBe('/accounts?view=requests');
    expect(requestsLink({ request: '', sort: 'dueAt', dir: 'asc', page: 1, size: 50 })).toBe(
      '/accounts?view=requests',
    );
  });

  it("writes what differs from the defaults, in the data layer's fixed order", () => {
    expect(requestsLink({ request: 'any' })).toBe('/accounts?view=requests&request=any');
    expect(requestsLink({ request: 'completed', sort: 'requestedAt', dir: 'desc', page: 3, size: 25 })).toBe(
      '/accounts?view=requests&sort=requestedAt&dir=desc&page=3&size=25&request=completed',
    );
    // The default sort leaves no key, so only the direction shows.
    expect(requestsLink({ dir: 'desc' })).toBe('/accounts?view=requests&dir=desc');
    expect(requestsLink({ sort: 'status' })).toBe('/accounts?view=requests&sort=status');
  });

  it('is the same address the data layer builds for a link from another page', () => {
    expect(requestsLink({ request: 'any' })).toBe(accountsListPath({ view: 'requests', request: 'any' }));
  });

  it('carries no key of another view, so an address read and written again is clean', () => {
    const read = parseRequestsAddress(params('view=requests&chip=guests&q=ann&status=blocked&request=any'));
    expect(requestsLink(read)).toBe('/accounts?view=requests&request=any');
  });
});

describe('what the status menu asks the server', () => {
  it('has the words of the menu, in its order', () => {
    expect(REQUEST_STATUS_OPTIONS.map((option) => option.label)).toEqual([
      'Open and in progress',
      'Open',
      'In progress',
      'Done',
      'Rejected',
      'All statuses',
    ]);
    expect(REQUEST_STATUS_OPTIONS.map((option) => option.value)).toEqual([
      '',
      'open',
      'in_progress',
      'completed',
      'rejected',
      'any',
    ]);
  });

  it('maps the menu to filters: open and in progress by default, no filter for all, else that status', () => {
    expect(requestFilters('')).toEqual({ status: ['open', 'in_progress'] });
    expect(requestFilters('open')).toEqual({ status: 'open' });
    expect(requestFilters('in_progress')).toEqual({ status: 'in_progress' });
    expect(requestFilters('completed')).toEqual({ status: 'completed' });
    expect(requestFilters('rejected')).toEqual({ status: 'rejected' });
    expect(requestFilters('any')).toEqual({});
  });
});
