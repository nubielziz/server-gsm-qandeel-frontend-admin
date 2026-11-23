// Tests for the small helpers of the Group views: who sees a group in words, comparing lists of ranks, and ticking one rank.
// They moved here from the pricing rules' test file when the Categories tab went.
import { describe, expect, it } from 'vitest';
import { sameIds, toggleRank, visibleToText } from './categories';

describe('visibleToText', () => {
  const ranks = [
    { id: 2, name: 'Wholesale' },
    { id: 3, name: 'VIP' },
  ];

  it('says "All" when no rank is named', () => {
    expect(visibleToText([], ranks)).toBe('All');
    expect(visibleToText([], undefined)).toBe('All');
  });

  it('names the ranks in the order the group lists them, and falls back to the id for one it does not know', () => {
    expect(visibleToText([3, 2], ranks)).toBe('VIP, Wholesale');
    expect(visibleToText([2, 9], ranks)).toBe('Wholesale, #9');
  });

  it('counts the ranks when their names are not available', () => {
    expect(visibleToText([2, 3], undefined)).toBe('2 ranks');
    expect(visibleToText([2], undefined)).toBe('1 rank');
  });
});

describe('sameIds', () => {
  it('compares lists of ids in any order', () => {
    expect(sameIds([1, 2], [2, 1])).toBe(true);
    expect(sameIds([1, 2], [1])).toBe(false);
    expect(sameIds([], [])).toBe(true);
  });
});

describe('toggleRank', () => {
  it('ticks a rank after the ones already ticked', () => {
    expect(toggleRank([2], 3, true)).toEqual([2, 3]);
    expect(toggleRank([], 3, true)).toEqual([3]);
  });

  it('does not tick a rank twice', () => {
    expect(toggleRank([2, 3], 3, true)).toEqual([2, 3]);
  });

  it('unticks a rank, and the last one leaves none (every rank sees the group)', () => {
    expect(toggleRank([2, 3], 2, false)).toEqual([3]);
    expect(toggleRank([3], 3, false)).toEqual([]);
    expect(toggleRank([3], 9, false)).toEqual([3]);
  });

  it('gives a new list and leaves the old one alone', () => {
    const ids = [2];
    expect(toggleRank(ids, 2, true)).not.toBe(ids);
    expect(ids).toEqual([2]);
  });
});
