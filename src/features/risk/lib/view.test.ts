// Tests for the Risk page's address: tab, blocklist filter, page and sort.
import { describe, expect, it } from 'vitest';
import {
  BLOCK_SORT_FIELDS,
  parseBlockView,
  parsePage,
  parseSort,
  parseTab,
  toBlockFilters,
  toRefineFilters,
  writeBlockView,
  writePage,
  writeSort,
  writeTab,
} from './view';

const params = (query: string) => new URLSearchParams(query);

describe('tab', () => {
  it('opens the queue unless the address names another tab', () => {
    expect(parseTab(params(''))).toBe('queue');
    expect(parseTab(params('tab=queue'))).toBe('queue');
    expect(parseTab(params('tab=rules'))).toBe('rules');
    expect(parseTab(params('tab=nonsense'))).toBe('queue');
  });

  it('opens the queue for the tab that was retired, with or without the rest of its address', () => {
    expect(parseTab(params('tab=checks'))).toBe('queue');
    expect(parseTab(params('tab=checks&kind=icloud&result=locked&check=9900&page=2'))).toBe('queue');
  });

  it('writes only the tab, leaving the queue as the clean address', () => {
    expect(writeTab('queue').toString()).toBe('');
    expect(writeTab('rules').toString()).toBe('tab=rules');
  });
});

describe('blocklist filter', () => {
  it('reads the kind and writes it back', () => {
    expect(parseBlockView(params('kind=imei'))).toEqual({ kind: 'imei' });
    expect(parseBlockView(params('kind=icloud'))).toEqual({ kind: '' });
    expect(writeBlockView(params('page=2'), { kind: 'card' }).toString()).toBe('kind=card');
    expect(writeBlockView(params('tab=block&kind=card&page=2'), { kind: '' }).toString()).toBe('tab=block');
    expect(toBlockFilters({ kind: 'card' })).toEqual({ kind: 'card' });
    expect(toBlockFilters({ kind: '' })).toEqual({});
  });

  it('turns filters into Refine filters, skipping the empty ones', () => {
    expect(toRefineFilters({ kind: 'card', q: undefined, source: '' })).toEqual([
      { field: 'kind', operator: 'eq', value: 'card' },
    ]);
  });
});

describe('page and sort', () => {
  it('reads a page of 1 or more', () => {
    expect(parsePage(params(''))).toBe(1);
    expect(parsePage(params('page=3'))).toBe(3);
    expect(parsePage(params('page=0'))).toBe(1);
    expect(parsePage(params('page=abc'))).toBe(1);
    expect(writePage(params('page=3&tab=block'), 1).toString()).toBe('tab=block');
    expect(writePage(params('tab=block'), 2).toString()).toBe('tab=block&page=2');
  });

  it('sorts newest first unless the address names a sortable column', () => {
    expect(parseSort(params(''), BLOCK_SORT_FIELDS)).toEqual({ field: 'createdAt', order: 'desc' });
    expect(parseSort(params('sort=kind&dir=asc'), BLOCK_SORT_FIELDS)).toEqual({
      field: 'kind',
      order: 'asc',
    });
    // The sort columns of the retired IMEI check table mean nothing now.
    expect(parseSort(params('sort=status&dir=asc'), BLOCK_SORT_FIELDS)).toEqual({
      field: 'createdAt',
      order: 'desc',
    });
  });

  it('leaves the default sort out of the address and goes back to page 1', () => {
    expect(
      writeSort(params('sort=kind&dir=asc&page=2'), { field: 'createdAt', order: 'desc' }).toString(),
    ).toBe('');
    expect(writeSort(params('page=2'), { field: 'kind', order: 'asc' }).toString()).toBe('sort=kind&dir=asc');
  });
});
