// Tests for what the Pricing view reads from the address: the search text, the group, the page and its size, with a default for every key that
// is missing or unreadable.
import { describe, expect, it } from 'vitest';
import { parseSize, readPricingAddress } from './usePricingAddress';

const read = (query: string) => readPricingAddress(new URLSearchParams(query));

describe('readPricingAddress', () => {
  it('reads an address with every key', () => {
    expect(read('view=pricing&type=server&q=%20unlock%20&group=4&page=3&size=100')).toEqual({
      q: 'unlock',
      group: 4,
      page: 3,
      size: 100,
    });
  });

  it('starts from the first page of 50 with no search and no group', () => {
    expect(read('view=pricing')).toEqual({ q: '', group: undefined, page: 1, size: 50 });
  });

  it('ignores a group, a page or a size that is not a usable number', () => {
    expect(read('group=abc&page=0&size=7')).toEqual({ q: '', group: undefined, page: 1, size: 50 });
    expect(read('group=-3&page=-2&size=')).toEqual({ q: '', group: undefined, page: 1, size: 50 });
  });
});

describe('parseSize', () => {
  it('accepts the sizes the footer offers and nothing else', () => {
    expect([25, 50, 100, 200].map((size) => parseSize(String(size)))).toEqual([25, 50, 100, 200]);
    expect(parseSize('75')).toBe(50);
    expect(parseSize(null)).toBe(50);
    expect(parseSize('abc')).toBe(50);
  });
});
