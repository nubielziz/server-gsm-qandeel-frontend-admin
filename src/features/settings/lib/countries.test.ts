// Tests for the country menu of the tax rate form: the assigned ISO codes only, named by the browser, "Name (CODE)", sorted by name.
import { describe, expect, it } from 'vitest';
import { countryLabel, countryMenu, ISO_COUNTRY_CODES, regionName } from './countries';

describe('the ISO country list', () => {
  it('holds the 249 assigned codes, each once, in capitals', () => {
    expect(ISO_COUNTRY_CODES).toHaveLength(249);
    expect(new Set(ISO_COUNTRY_CODES).size).toBe(249);
    expect(ISO_COUNTRY_CODES.every((code) => /^[A-Z]{2}$/.test(code))).toBe(true);
    // Reserved and retired codes the browser also names are not countries.
    for (const code of ['EU', 'UN', 'ZZ', 'SU', 'UK', 'XK']) expect(ISO_COUNTRY_CODES).not.toContain(code);
  });

  it('names a country in English and nothing for a code that is not an assigned country', () => {
    expect(regionName('jp')).toBe('Japan');
    expect(regionName('GB')).toBe('United Kingdom');
    expect(regionName('EU')).toBeUndefined();
    expect(regionName('??')).toBeUndefined();
  });

  it('writes "Name (CODE)", or the bare code when it has no name', () => {
    expect(countryLabel('gb')).toBe('United Kingdom (GB)');
    expect(countryLabel('ZZ')).toBe('ZZ');
  });

  it('is a menu of every country sorted by name, with the code as the value', () => {
    const menu = countryMenu();
    expect(menu).toHaveLength(249);
    expect(menu).toContainEqual({ value: 'DE', label: 'Germany (DE)' });
    const names = menu.map((option) => option.label.replace(/ \([A-Z]{2}\)$/, ''));
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    // Built once.
    expect(countryMenu()).toBe(menu);
  });
});
