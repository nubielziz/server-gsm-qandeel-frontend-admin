// Tests for the list's address parameters and the API query they become.
import { describe, expect, it } from 'vitest';
import {
  campaignLogPath,
  campaignPath,
  clearFilterParams,
  hasFilters,
  PAGE_SIZE,
  parseFilters,
  parsePage,
  toListQuery,
  writeFilters,
  writePage,
} from './filters';

describe('the address', () => {
  it('reads known statuses and purposes and ignores anything else', () => {
    expect(parseFilters(new URLSearchParams('status=sent&purpose=marketing&q=ram'))).toEqual({
      status: 'sent',
      purpose: 'marketing',
      q: 'ram',
    });
    expect(parseFilters(new URLSearchParams('status=bogus&purpose=x'))).toEqual({
      status: '',
      purpose: '',
      q: '',
    });
  });

  it('writes a filter, drops an empty one, goes back to page 1 and keeps the rest', () => {
    const base = new URLSearchParams('status=sent&page=3&keep=1');
    expect(writeFilters(base, { purpose: 'service' }).toString()).toBe('status=sent&keep=1&purpose=service');
    expect(writeFilters(base, { status: '' }).toString()).toBe('keep=1');
    expect(clearFilterParams(new URLSearchParams('status=sent&q=a&page=2')).toString()).toBe('');
  });

  it('reads and writes the page', () => {
    expect(parsePage(new URLSearchParams('page=4'))).toBe(4);
    expect(parsePage(new URLSearchParams('page=0'))).toBe(1);
    expect(parsePage(new URLSearchParams('page=abc'))).toBe(1);
    expect(writePage(new URLSearchParams(), 2).toString()).toBe('page=2');
    expect(writePage(new URLSearchParams('page=2'), 1).toString()).toBe('');
  });

  it('knows when a filter is on', () => {
    expect(hasFilters({ status: '', purpose: '', q: '  ' })).toBe(false);
    expect(hasFilters({ status: 'draft', purpose: '', q: '' })).toBe(true);
  });
});

describe('the API query', () => {
  it('asks for one page, newest first, with the filters that are on', () => {
    expect(toListQuery({ status: 'sent', purpose: '', q: ' ram ' }, 2)).toEqual({
      start: PAGE_SIZE,
      end: 2 * PAGE_SIZE,
      sort: ['createdAt'],
      order: ['desc'],
      q: 'ram',
      filters: { status: 'sent' },
    });
  });

  it('writes the paths of the pages', () => {
    expect(campaignPath(7)).toBe('/notifications/7');
    expect(campaignLogPath(7)).toBe('/settings?tab=log&campaignId=7');
  });
});
