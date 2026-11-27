// Tests for the storefront countries: the twelve of the shop, the name of a code (the code itself when the list does not know it), and a menu
// that keeps an account's own country selectable.
import { describe, expect, it } from 'vitest';
import { allCountries, COUNTRIES, countryName, countryOptions, merchantCountryOptions } from './countries';

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

describe('the ISO country list of a merchant rank', () => {
  it('has the 249 assigned ISO 3166-1 codes, each once, named in English and sorted by name', () => {
    const all = allCountries();
    expect(all).toHaveLength(249);
    expect(new Set(all.map((country) => country.code)).size).toBe(249);
    expect(all.every((country) => /^[A-Z]{2}$/.test(country.code))).toBe(true);
    // A name came from the browser for every code: none is left shown as its own code.
    expect(all.filter((country) => country.name === country.code)).toEqual([]);
    expect(all.find((country) => country.code === 'JO')?.name).toBe('Jordan');
    expect(all.find((country) => country.code === 'AE')?.name).toBe('United Arab Emirates');
    expect(all.find((country) => country.code === 'GB')?.name).toBe('United Kingdom');
    const names = all.map((country) => country.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
    // Every country of the shop's own list is in it.
    expect(COUNTRIES.every((country) => all.some((iso) => iso.code === country.code))).toBe(true);
  });

  it('is built once', () => {
    expect(allCountries()).toBe(allCountries());
  });

  it('offers "Choose a country", then "Name (CODE)" with the code as the value', () => {
    const options = merchantCountryOptions();
    expect(options).toHaveLength(250);
    expect(options[0]).toEqual({ value: '', label: 'Choose a country' });
    expect(options).toContainEqual({ value: 'JO', label: 'Jordan (JO)' });
    expect(options).toContainEqual({ value: 'AE', label: 'United Arab Emirates (AE)' });
    expect(merchantCountryOptions('JO')).toHaveLength(250);
  });

  it('keeps a stored code the list does not know chosen, shown as the code, right after the empty option', () => {
    const options = merchantCountryOptions('XK');
    expect(options).toHaveLength(251);
    expect(options[1]).toEqual({ value: 'XK', label: 'XK' });
  });
});
