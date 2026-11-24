// Tests for the list state in the address: reading it, writing it with defaults left out, and turning it into API filters.
import { describe, expect, it } from 'vitest';
import {
  clearView,
  hasActiveFilters,
  HELP_VIEW,
  PUBLISH_ITEMS_VIEW,
  parseView,
  resetView,
  toRefineFilters,
  writeView,
  type ViewSpec,
} from './views';

const params = (query: string) => new URLSearchParams(query);

// A tab with a filter, the most recently changed first: the shape the parsing and writing rules are tested on (the page types
// of the retired landing tab were such a filter).
const FILTERED_VIEW: ViewSpec = {
  sortFields: ['title', 'status', 'updatedAt'],
  defaultSort: { field: 'updatedAt', order: 'desc' },
  filters: { kind: ['static', 'blog'] },
};

describe('parseView', () => {
  it('reads the search, page, sort and filter', () => {
    expect(
      parseView(params('tab=content&q=att&page=3&sort=title&dir=desc&kind=blog'), FILTERED_VIEW),
    ).toEqual({
      q: 'att',
      page: 3,
      sort: { field: 'title', order: 'desc' },
      filters: { kind: 'blog' },
    });
  });

  it('falls back to the default sort and an empty filter for anything unknown or malformed', () => {
    const view = parseView(params('sort=bogus&dir=desc&page=0x&kind=planet'), FILTERED_VIEW);
    expect(view.sort).toEqual({ field: 'updatedAt', order: 'desc' });
    expect(view.page).toBe(1);
    expect(view.filters).toEqual({ kind: '' });
  });

  it('knows the sorts of each tab', () => {
    expect(parseView(params('sort=title'), FILTERED_VIEW).sort).toEqual({ field: 'title', order: 'asc' });
    expect(parseView(params('sort=isPublished&dir=desc'), HELP_VIEW).sort).toEqual({
      field: 'isPublished',
      order: 'desc',
    });
    expect(parseView(params('sort=isListed'), HELP_VIEW).sort).toEqual({ field: 'sort', order: 'asc' });
    expect(parseView(params('sort=publicTitle'), HELP_VIEW).sort).toEqual({ field: 'sort', order: 'asc' });
  });
});

describe('writeView', () => {
  it('leaves defaults out and keeps the tab', () => {
    const next = writeView(
      params('tab=help&page=4&sort=question&dir=desc&q=x'),
      { q: '', page: 1, sort: HELP_VIEW.defaultSort },
      HELP_VIEW,
    );
    expect(next.toString()).toBe('tab=help');
  });

  it('writes a filter, a page and a non-default sort', () => {
    const next = writeView(
      params('tab=content'),
      { filters: { kind: 'blog' }, page: 2, sort: { field: 'title', order: 'asc' } },
      FILTERED_VIEW,
    );
    expect(Object.fromEntries(next)).toEqual({
      tab: 'content',
      kind: 'blog',
      page: '2',
      sort: 'title',
      dir: 'asc',
    });
  });
});

describe('hasActiveFilters and clearView', () => {
  it('is on for a search or a filter, and clearing keeps the sort and the tab', () => {
    const base = params('tab=content&q=att&kind=static&page=2&sort=title&dir=asc');
    expect(hasActiveFilters(parseView(base, FILTERED_VIEW))).toBe(true);
    expect(hasActiveFilters(parseView(params('tab=content'), FILTERED_VIEW))).toBe(false);
    expect(clearView(base, FILTERED_VIEW).toString()).toBe('tab=content&sort=title&dir=asc');
  });
});

describe('resetView', () => {
  it('puts the search, the filters, the page and the sort back and keeps only the rest of the address', () => {
    const base = params('tab=publish&run=5&q=att&state=review&page=2&sort=cost&dir=desc');
    expect(resetView(base, PUBLISH_ITEMS_VIEW).toString()).toBe('tab=publish&run=5');
    expect(parseView(resetView(base, PUBLISH_ITEMS_VIEW), PUBLISH_ITEMS_VIEW)).toEqual({
      q: '',
      page: 1,
      sort: PUBLISH_ITEMS_VIEW.defaultSort,
      filters: { result: '', state: '', included: '', flag: '', brandKind: '' },
    });
  });
});

describe('toRefineFilters', () => {
  it('sends the search as q and an array as one filter with several values', () => {
    expect(toRefineFilters(' att ', { kind: ['carrier', 'model'], status: 'draft', flag: true })).toEqual([
      { field: 'q', operator: 'eq', value: 'att' },
      { field: 'kind', operator: 'in', value: ['carrier', 'model'] },
      { field: 'status', operator: 'eq', value: 'draft' },
      { field: 'flag', operator: 'eq', value: true },
    ]);
  });

  it('leaves out an empty search and empty or missing values', () => {
    expect(toRefineFilters('  ', { kind: '', status: undefined })).toEqual([]);
  });
});
