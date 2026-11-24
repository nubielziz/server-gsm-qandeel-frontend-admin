// Tests for the storefront countries: the twelve of the shop, the name of a code (the code itself when the list does not know it), and a menu
// that keeps an account's own country selectable.
import { describe, expect, it } from 'vitest';
import { COUNTRIES, countryName, countryOptions } from './countries';

describe('countries', () => {
  it('names the twelve storefront countries and falls back to the code', () => {
    expect(COUNTRIES).toHaveLength(12);
    expect(countryName('GB')).toBe('United Kingdom');
    expect(countryName('PL')).toBe('PL');
  });

  it('keeps a country the list does not know selectable, first', () => {
    expect(countryOptions().map((option) => option.value)).toEqual(COUNTRIES.map((country) => country.code));
    expect(countryOptions('GB')).toHaveLength(12);
    expect(countryOptions('PL')[0]).toEqual({ value: 'PL', label: 'PL' });
    expect(countryOptions('PL')).toHaveLength(13);
  });
});
