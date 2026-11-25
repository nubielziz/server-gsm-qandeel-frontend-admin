// Tests for the direction of a tab change: the content comes from the side of the tab that was clicked.
import { describe, expect, it } from 'vitest';
import { tabDirection, tabShift } from './tabDirection';
import { TAB_SHIFT } from './tokens';

const order = ['open', 'review', 'done'];

describe('tabDirection', () => {
  it('is +1 for a tab further along the strip and -1 for one nearer the start', () => {
    expect(tabDirection('open', 'review', order)).toBe(1);
    expect(tabDirection('open', 'done', order)).toBe(1);
    expect(tabDirection('done', 'review', order)).toBe(-1);
    expect(tabDirection('review', 'open', order)).toBe(-1);
  });

  it('is 0 for the same tab and for a value that is not in the order', () => {
    expect(tabDirection('open', 'open', order)).toBe(0);
    expect(tabDirection('open', 'other', order)).toBe(0);
    expect(tabDirection('other', 'done', order)).toBe(0);
    expect(tabDirection('', 'done', order)).toBe(0);
    expect(tabDirection('open', 'review', [])).toBe(0);
  });
});

describe('tabShift', () => {
  it('moves the content by the tab shift towards the side it comes from', () => {
    expect(tabShift('open', 'done', order)).toBe(TAB_SHIFT);
    expect(tabShift('done', 'open', order)).toBe(-TAB_SHIFT);
    expect(tabShift('open', 'other', order)).toBe(0);
  });
});
