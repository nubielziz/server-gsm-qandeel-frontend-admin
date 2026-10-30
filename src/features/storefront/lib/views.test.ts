// Tests for the list state in the address: reading it, writing it with defaults left out, and turning it into API filters.
import { describe, expect, it } from 'vitest';
import {
  clearView,
  hasActiveFilters,
  HELP_VIEW,
  LANDING_VIEW,
  LISTING_VIEW,
  parseView,
  toRefineFilters,
  writeView,
} from './views';

const params = (query: string) => new URLSearchParams(query);

describe('parseView', () => {
  it('reads the search, page, sort and filter', () => {
    expect(
      parseView(params('tab=landing&q=att&page=3&sort=title&dir=desc&kind=carrier'), LANDING_VIEW),
    ).toEqual({
      q: 'att',
      page: 3,
      sort: { field: 'title', order: 'desc' },
      filters: { kind: 'carrier' },
    });
  });

  it('falls back to the default sort and an empty filter for anything unknown or malformed', () => {
    const view = parseView(params('sort=bogus&dir=desc&page=0x&kind=planet'), LANDING_VIEW);
    expect(view.sort).toEqual({ field: 'updatedAt', order: 'desc' });
    expect(view.page).toBe(1);
    expect(view.filters).toEqual({ kind: '' });
  });

  it('knows the sorts of each tab', () => {
    expect(parseView(params('sort=isListed'), LISTING_VIEW).sort).toEqual({
      field: 'isListed',
      order: 'asc',
    });
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
      params('tab=landing'),
      { filters: { kind: 'tool' }, page: 2, sort: { field: 'title', order: 'asc' } },
      LANDING_VIEW,
    );
    expect(Object.fromEntries(next)).toEqual({
      tab: 'landing',
      kind: 'tool',
      page: '2',
      sort: 'title',
      dir: 'asc',
    });
  });
});

describe('hasActiveFilters and clearView', () => {
  it('is on for a search or a filter, and clearing keeps the sort and the tab', () => {
    const base = params('tab=landing&q=att&kind=carrier&page=2&sort=title&dir=asc');
    expect(hasActiveFilters(parseView(base, LANDING_VIEW))).toBe(true);
    expect(hasActiveFilters(parseView(params('tab=landing'), LANDING_VIEW))).toBe(false);
    expect(clearView(base, LANDING_VIEW).toString()).toBe('tab=landing&sort=title&dir=asc');
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
