// Tests for the "Pays now" words of the Set Pricing part: a saved fixed price, or following the base price with the rank's discount.
import { describe, expect, it } from 'vitest';
import { followWords, paysNowOf } from './rankPrices';

describe('followWords', () => {
  it('says the base price for a rank with no discount, however the server writes zero', () => {
    expect(followWords({ discountPercent: '0' })).toBe('Base price');
    expect(followWords({ discountPercent: '0.00' })).toBe('Base price');
  });

  it('adds the discount without trailing zeros', () => {
    expect(followWords({ discountPercent: '4.00' })).toBe('Base price less 4%');
    expect(followWords({ discountPercent: '2.5000' })).toBe('Base price less 2.5%');
  });
});

describe('paysNowOf', () => {
  const saved = [{ groupId: 3, price: '15.9000' }];

  it('gives the saved fixed price of a rank that has one', () => {
    expect(paysNowOf({ id: 3, discountPercent: '8.00' }, saved)).toEqual({ kind: 'fixed', price: '15.9000' });
  });

  it('gives the words for a rank with no fixed price', () => {
    expect(paysNowOf({ id: 2, discountPercent: '4.00' }, saved)).toEqual({
      kind: 'follows',
      words: 'Base price less 4%',
    });
  });

  it('follows the base price when nothing is saved at all', () => {
    expect(paysNowOf({ id: 1, discountPercent: '0' }, [])).toEqual({ kind: 'follows', words: 'Base price' });
  });
});
