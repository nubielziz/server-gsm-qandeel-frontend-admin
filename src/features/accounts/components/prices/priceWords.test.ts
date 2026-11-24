// Tests for the words of the Prices part: the discount line, the kind of a service, and what an account pays without a fixed price.
import { describe, expect, it } from 'vitest';
import { discountWords, kindWord, paysWords } from './priceWords';

describe('discountWords', () => {
  it('says how much a rank takes off the base prices, without extra zeros', () => {
    expect(discountWords('8.0000')).toBe('8% off base prices');
    expect(discountWords('2.5')).toBe('2.5% off base prices');
  });

  it('says base prices for a rank with no discount', () => {
    expect(discountWords('0')).toBe('base prices');
    expect(discountWords('0.0000')).toBe('base prices');
  });
});

describe('kindWord', () => {
  it('spells the four kinds as the console does and leaves an unknown one as the server sent it', () => {
    expect(kindWord('imei')).toBe('IMEI');
    expect(kindWord('server')).toBe('Server');
    expect(kindWord('hologram')).toBe('hologram');
    expect(kindWord(undefined)).toBe('');
  });

  it('never reads a property of the table that is not a kind', () => {
    expect(kindWord('toString')).toBe('toString');
  });
});

describe('paysWords', () => {
  it('names the rank whose price the account pays', () => {
    expect(paysWords('VIP')).toBe('pays the VIP price');
  });
});
