// Tests for pagerItems: the window of page numbers of the footer pager.
import { describe, expect, it } from 'vitest';
import { pagerItems } from './pageNumbers';

describe('pagerItems', () => {
  it('shows every page when they fit in the window', () => {
    expect(pagerItems(1, 1)).toEqual([1]);
    expect(pagerItems(2, 3)).toEqual([1, 2, 3]);
    expect(pagerItems(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('starts at the first page and marks the cut after the window', () => {
    expect(pagerItems(1, 18)).toEqual([1, 2, 3, 4, 5, 'gap-after']);
    expect(pagerItems(2, 18)).toEqual([1, 2, 3, 4, 5, 'gap-after']);
  });

  it('centres the window on a page in the middle and marks both cuts', () => {
    expect(pagerItems(9, 18)).toEqual(['gap-before', 7, 8, 9, 10, 11, 'gap-after']);
  });

  it('ends at the last page and marks the cut before the window', () => {
    expect(pagerItems(18, 18)).toEqual(['gap-before', 14, 15, 16, 17, 18]);
    expect(pagerItems(17, 18)).toEqual(['gap-before', 14, 15, 16, 17, 18]);
  });

  it('keeps the current page in the window when it is out of range, and honours the span', () => {
    expect(pagerItems(99, 18)).toEqual(['gap-before', 14, 15, 16, 17, 18]);
    expect(pagerItems(0, 18)).toEqual([1, 2, 3, 4, 5, 'gap-after']);
    expect(pagerItems(5, 18, 3)).toEqual(['gap-before', 4, 5, 6, 'gap-after']);
    expect(pagerItems(1, 0)).toEqual([1]);
  });
});
