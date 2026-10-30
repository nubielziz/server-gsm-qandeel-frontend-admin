// Tests for the Risk page's address: tab, filters, page, sort and the open check.
import { describe, expect, it } from 'vitest';
import {
  normalizeSearch,
  parseBlockView,
  parseChecksView,
  parseCheckId,
  parsePage,
  parseSort,
  parseTab,
  toBlockFilters,
  toCheckFilters,
  toRefineFilters,
  writeBlockView,
  writeCheckId,
  writeChecksView,
  writePage,
  writeSort,
  writeTab,
  CHECK_SORT_FIELDS,
} from './view';

const params = (query: string) => new URLSearchParams(query);

describe('tab', () => {
  it('opens the queue unless the address names another tab', () => {
    expect(parseTab(params(''))).toBe('queue');
    expect(parseTab(params('tab=queue'))).toBe('queue');
    expect(parseTab(params('tab=rules'))).toBe('rules');
    expect(parseTab(params('tab=nonsense'))).toBe('queue');
  });

  it('writes only the tab, leaving the queue as the clean address', () => {
    expect(writeTab('queue').toString()).toBe('');
    expect(writeTab('checks').toString()).toBe('tab=checks');
  });
});

describe('IMEI check filters', () => {
  it('reads the search, kind and result, dropping what is unknown', () => {
    expect(parseChecksView(params('q=pixel&kind=icloud&result=locked'))).toEqual({
      q: 'pixel',
      kind: 'icloud',
      result: 'locked',
    });
    expect(parseChecksView(params('kind=bogus&result=bogus'))).toEqual({ q: '', kind: '', result: '' });
  });

  it('writes a change, goes back to page 1 and leaves empty filters out', () => {
    const next = writeChecksView(params('tab=checks&page=3&sort=status&dir=asc'), { kind: 'icloud' });
    expect(next.toString()).toBe('tab=checks&sort=status&dir=asc&kind=icloud');
    expect(writeChecksView(next, { kind: '' }).toString()).toBe('tab=checks&sort=status&dir=asc');
  });

  it('searches an IMEI without the spaces the screen puts in it, and anything else as typed', () => {
    expect(normalizeSearch(' 35 389011 884201 4 ')).toBe('353890118842014');
    expect(normalizeSearch('Redmi Note')).toBe('Redmi Note');
    expect(toCheckFilters({ q: '35 389011', kind: 'basic', result: '' })).toEqual({
      q: '35389011',
      checkType: 'basic',
    });
  });

  it('turns filters into Refine filters, skipping the empty ones', () => {
    expect(toRefineFilters({ checkType: 'basic', status: undefined, q: '' })).toEqual([
      { field: 'checkType', operator: 'eq', value: 'basic' },
    ]);
  });
});

describe('blocklist filter', () => {
  it('reads the kind and writes it back', () => {
    expect(parseBlockView(params('kind=imei'))).toEqual({ kind: 'imei' });
    expect(parseBlockView(params('kind=icloud'))).toEqual({ kind: '' });
    expect(writeBlockView(params('page=2'), { kind: 'card' }).toString()).toBe('kind=card');
    expect(toBlockFilters({ kind: 'card' })).toEqual({ kind: 'card' });
    expect(toBlockFilters({ kind: '' })).toEqual({});
  });
});

describe('page and sort', () => {
  it('reads a page of 1 or more', () => {
    expect(parsePage(params(''))).toBe(1);
    expect(parsePage(params('page=3'))).toBe(3);
    expect(parsePage(params('page=0'))).toBe(1);
    expect(parsePage(params('page=abc'))).toBe(1);
    expect(writePage(params('page=3&tab=checks'), 1).toString()).toBe('tab=checks');
    expect(writePage(params('tab=checks'), 2).toString()).toBe('tab=checks&page=2');
  });

  it('sorts newest first unless the address names a sortable column', () => {
    expect(parseSort(params(''), CHECK_SORT_FIELDS)).toEqual({ field: 'createdAt', order: 'desc' });
    expect(parseSort(params('sort=status&dir=asc'), CHECK_SORT_FIELDS)).toEqual({
      field: 'status',
      order: 'asc',
    });
    expect(parseSort(params('sort=imei&dir=asc'), CHECK_SORT_FIELDS)).toEqual({
      field: 'createdAt',
      order: 'desc',
    });
  });

  it('leaves the default sort out of the address and goes back to page 1', () => {
    expect(
      writeSort(params('sort=status&dir=asc&page=2'), { field: 'createdAt', order: 'desc' }).toString(),
    ).toBe('');
    expect(writeSort(params('page=2'), { field: 'status', order: 'asc' }).toString()).toBe(
      'sort=status&dir=asc',
    );
  });
});

describe('open check', () => {
  it('reads and writes the check id', () => {
    expect(parseCheckId(params('check=9900'))).toBe(9900);
    expect(parseCheckId(params('check=abc'))).toBeNull();
    expect(writeCheckId(params('tab=checks'), 7).toString()).toBe('tab=checks&check=7');
    expect(writeCheckId(params('tab=checks&check=7'), null).toString()).toBe('tab=checks');
  });
});
