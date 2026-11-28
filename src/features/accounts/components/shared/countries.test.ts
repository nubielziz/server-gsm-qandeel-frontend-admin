// Tests for the countries of the Accounts page: every ISO country, the name of a code (the code itself when it is not a country), and a
// menu that keeps an account's own country selectable.
import { describe, expect, it } from 'vitest';
import { allCountries, countryName, countryOptions } from './countries';

describe('the ISO country list', () => {
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
  });

  it('is built once', () => {
    expect(allCountries()).toBe(allCountries());
  });

  it('names any country, not only the twelve the demo listed, and falls back to the code', () => {
    expect(countryName('GB')).toBe('United Kingdom');
    expect(countryName('PL')).toBe('Poland');
    expect(countryName('JO')).toBe('Jordan');
    expect(countryName('XK')).toBe('XK');
    expect(countryName('')).toBe('');
  });
});

describe('the country menu of an account', () => {
  it('offers "Choose a country", then every country as "Name (CODE)" with the code as the value', () => {
    const options = countryOptions();
    expect(options).toHaveLength(250);
    expect(options[0]).toEqual({ value: '', label: 'Choose a country' });
    expect(options).toContainEqual({ value: 'JO', label: 'Jordan (JO)' });
    expect(options).toContainEqual({ value: 'AE', label: 'United Arab Emirates (AE)' });
    expect(options).toContainEqual({ value: 'EG', label: 'Egypt (EG)' });
    expect(countryOptions('JO')).toHaveLength(250);
  });

  it('keeps a stored code the list does not know chosen, shown as the code, right after the empty option', () => {
    const options = countryOptions('XK');
    expect(options).toHaveLength(251);
    expect(options[1]).toEqual({ value: 'XK', label: 'XK' });
  });
});
