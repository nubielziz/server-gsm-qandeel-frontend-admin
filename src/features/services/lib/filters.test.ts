// Tests for the Services tab's address parameters and for the API filters built from them.
import { describe, expect, it } from 'vitest';
import {
  clearServiceFilters,
  DEFAULT_SORT,
  hasActiveFilters,
  parsePage,
  parseServiceFilters,
  parseSort,
  toListFilters,
  toListQuery,
  toRefineFilters,
  writeServiceFilters,
  writeView,
} from './filters';

const params = (text: string) => new URLSearchParams(text);

describe('parseServiceFilters', () => {
  it('reads an empty address as no filter', () => {
    expect(parseServiceFilters(params(''))).toEqual({ q: '', type: '', belowFloor: false, status: '' });
  });

  it('reads every filter', () => {
    expect(parseServiceFilters(params('q=unlock&type=server&belowFloor=true&status=disabled'))).toEqual({
      q: 'unlock',
      type: 'server',
      belowFloor: true,
      status: 'disabled',
    });
  });

  it('drops values it does not know', () => {
    expect(parseServiceFilters(params('type=sim&belowFloor=1&status=active'))).toEqual(
      parseServiceFilters(params('')),
    );
  });
});

describe('writeServiceFilters', () => {
  it('leaves the defaults out of the address', () => {
    expect(writeServiceFilters(params('belowFloor=true'), { belowFloor: false }).toString()).toBe('');
  });

  it('changes one filter and keeps everything else', () => {
    const next = writeServiceFilters(params('tab=services&page=3&q=abc'), { type: 'file', q: '' });
    expect(next.get('tab')).toBe('services');
    expect(next.get('page')).toBe('3');
    expect(next.get('type')).toBe('file');
    expect(next.has('q')).toBe(false);
  });
});

describe('hasActiveFilters and clearServiceFilters', () => {
  it('counts every toolbar filter, ignoring blank search text', () => {
    expect(hasActiveFilters(parseServiceFilters(params('q=%20')))).toBe(false);
    expect(hasActiveFilters(parseServiceFilters(params('status=disabled')))).toBe(true);
  });

  it('removes the filters and the page, and keeps the rest', () => {
    const next = clearServiceFilters(
      params('q=a&type=imei&belowFloor=true&status=disabled&page=2&sort=cost&dir=desc'),
    );
    expect(next.toString()).toBe('sort=cost&dir=desc');
  });
});

describe('page and sort', () => {
  it('reads the page, falling back to 1', () => {
    expect(parsePage(params('page=3'))).toBe(3);
    expect(parsePage(params('page=0'))).toBe(1);
    expect(parsePage(params('page=abc'))).toBe(1);
  });

  it('reads only the sorts the server offers, A to Z by default', () => {
    expect(parseSort(params(''))).toEqual(DEFAULT_SORT);
    expect(parseSort(params('sort=basePrice&dir=desc'))).toEqual({ field: 'basePrice', order: 'desc' });
    expect(parseSort(params('sort=basePrice'))).toEqual({ field: 'basePrice', order: 'asc' });
    expect(parseSort(params('sort=margin&dir=desc'))).toEqual(DEFAULT_SORT);
  });

  it('writes the page and sort, leaving the first page and the default sort out', () => {
    expect(writeView(params('page=2'), { page: 1 }).toString()).toBe('');
    expect(writeView(params(''), { page: 2 }).toString()).toBe('page=2');
    expect(writeView(params('sort=cost&dir=desc'), { sort: DEFAULT_SORT }).toString()).toBe('');
    expect(writeView(params(''), { sort: { field: 'cost', order: 'desc' } }).toString()).toBe(
      'sort=cost&dir=desc',
    );
  });
});

describe('the API filters', () => {
  const filters = parseServiceFilters(params('q=%20unlock%20&type=imei&belowFloor=true&status=disabled'));

  it('trims the search and leaves out what is off', () => {
    expect(toListFilters(filters)).toEqual({
      q: 'unlock',
      type: 'imei',
      belowFloor: true,
      status: 'disabled',
    });
    expect(toListFilters(parseServiceFilters(params('')))).toEqual({});
  });

  it('become Refine filters, with the search as a plain field', () => {
    expect(toRefineFilters(toListFilters(filters))).toEqual([
      { field: 'q', operator: 'eq', value: 'unlock' },
      { field: 'type', operator: 'eq', value: 'imei' },
      { field: 'belowFloor', operator: 'eq', value: true },
      { field: 'status', operator: 'eq', value: 'disabled' },
    ]);
  });

  it('become a list query for the calls that skip Refine', () => {
    expect(toListQuery({ q: 'a', belowFloor: true, status: 'active' }, { start: 0, end: 1 })).toEqual({
      start: 0,
      end: 1,
      q: 'a',
      filters: { belowFloor: true, status: 'active' },
    });
  });
});
