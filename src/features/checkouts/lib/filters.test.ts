// Tests for the address <-> list question: what the filter, search, page, sort and period write to the address and what the API is asked.
import { describe, expect, it } from 'vitest';
import {
  checkoutsListPath,
  clearFilters,
  DEFAULT_SORT,
  hasSearch,
  PAGE_SIZE,
  parseDays,
  parseFilters,
  parsePage,
  parseSort,
  toListQuery,
  writeFilters,
  writeView,
} from './filters';

const params = (text: string) => new URLSearchParams(text);

describe('parseFilters', () => {
  it('opens on "Needs a reminder" with no search', () => {
    expect(parseFilters(params(''))).toEqual({ filter: 'remind', q: '' });
  });

  it('reads All and the search text, and drops an unknown filter', () => {
    expect(parseFilters(params('filter=all&q=sam'))).toEqual({ filter: 'all', q: 'sam' });
    expect(parseFilters(params('filter=everything'))).toEqual({ filter: 'remind', q: '' });
  });
});

describe('writeFilters', () => {
  it('leaves the defaults out of the address and keeps everything else', () => {
    expect(writeFilters(params('filter=all&page=3'), { filter: 'remind' }).toString()).toBe('page=3');
    expect(writeFilters(params(''), { filter: 'all', q: 'sam' }).toString()).toBe('filter=all&q=sam');
    expect(writeFilters(params('q=sam'), { q: '' }).toString()).toBe('');
  });
});

describe('clearFilters', () => {
  it('removes the search, keeps the filter and goes back to page 1', () => {
    expect(clearFilters(params('filter=all&q=sam&page=2')).toString()).toBe('filter=all');
  });
});

describe('page, sort and period', () => {
  it('reads the page and falls back to 1 for nonsense', () => {
    expect(parsePage(params('page=4'))).toBe(4);
    expect(parsePage(params('page=0'))).toBe(1);
    expect(parsePage(params('page=-2'))).toBe(1);
    expect(parsePage(params('page=abc'))).toBe(1);
  });

  it('reads the sort from the columns the server can sort by, newest first otherwise', () => {
    expect(parseSort(params(''))).toEqual(DEFAULT_SORT);
    expect(parseSort(params('sort=grossAmount&dir=asc'))).toEqual({ field: 'grossAmount', order: 'asc' });
    expect(parseSort(params('sort=grossAmount'))).toEqual({ field: 'grossAmount', order: 'desc' });
    expect(parseSort(params('sort=email&dir=asc'))).toEqual(DEFAULT_SORT);
  });

  it('reads one of the offered funnel periods, else 30 days', () => {
    expect(parseDays(params('days=7'))).toBe(7);
    expect(parseDays(params('days=90'))).toBe(90);
    expect(parseDays(params('days=14'))).toBe(30);
    expect(parseDays(params(''))).toBe(30);
  });

  it('writes the page, sort and period and leaves their defaults out', () => {
    expect(writeView(params(''), { page: 2 }).toString()).toBe('page=2');
    expect(writeView(params('page=2'), { page: 1 }).toString()).toBe('');
    expect(writeView(params(''), { sort: { field: 'grossAmount', order: 'asc' } }).toString()).toBe(
      'sort=grossAmount&dir=asc',
    );
    expect(writeView(params('sort=grossAmount&dir=asc'), { sort: DEFAULT_SORT }).toString()).toBe('');
    expect(writeView(params(''), { days: 7 }).toString()).toBe('days=7');
    expect(writeView(params('days=7'), { days: 30 }).toString()).toBe('');
  });
});

describe('toListQuery', () => {
  it('asks for the reminder-ready checkouts one page at a time, newest first', () => {
    expect(toListQuery({ filter: 'remind', q: '' }, 1, DEFAULT_SORT)).toEqual({
      start: 0,
      end: PAGE_SIZE,
      sort: ['createdAt'],
      order: ['desc'],
      filters: { canRecover: true },
    });
  });

  it('asks for every checkout on All, with the trimmed search and the page range', () => {
    expect(toListQuery({ filter: 'all', q: '  sam ' }, 3, { field: 'grossAmount', order: 'asc' })).toEqual({
      start: 2 * PAGE_SIZE,
      end: 3 * PAGE_SIZE,
      sort: ['grossAmount'],
      order: ['asc'],
      q: 'sam',
      filters: {},
    });
  });
});

describe('hasSearch and checkoutsListPath', () => {
  it('counts a search only when it has text', () => {
    expect(hasSearch({ filter: 'all', q: '  ' })).toBe(false);
    expect(hasSearch({ filter: 'all', q: 'a' })).toBe(true);
  });

  it('builds the address of the page for links', () => {
    expect(checkoutsListPath()).toBe('/checkouts');
    expect(checkoutsListPath({ filter: 'all' })).toBe('/checkouts?filter=all');
  });
});
