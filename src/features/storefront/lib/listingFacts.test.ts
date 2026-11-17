// Tests for the choices of the listing editor's Brand and Country fields.
import { describe, expect, it } from 'vitest';
import {
  ARAB_COUNTRY_CODES,
  BRAND_OPTIONS,
  brandSlug,
  countryOptions,
  OTHER_BRAND,
  SHOP_BRANDS,
  shopBrand,
} from './listingFacts';

describe('the shop brands', () => {
  it('lists each brand once, in order, with a slug the shop can find a logo by', () => {
    expect(SHOP_BRANDS).toHaveLength(65);
    const sorted = [...SHOP_BRANDS].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    expect(SHOP_BRANDS).toEqual(sorted);
    const slugs = SHOP_BRANDS.map(brandSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(slugs).toEqual(expect.arrayContaining(['apple', 'app-store', 'macos', 'z3x', 'riot-games']));
  });

  it('reads a saved text as the shop brand with the same slug, and a name of one’s own as none', () => {
    expect(shopBrand('Apple')).toBe('Apple');
    expect(shopBrand('  apple ')).toBe('Apple');
    expect(shopBrand('APP STORE')).toBe('App Store');
    expect(shopBrand('Acme Phones')).toBeNull();
    expect(shopBrand('')).toBeNull();
  });

  it('offers no brand first, the brands, then Other', () => {
    expect(BRAND_OPTIONS[0]).toEqual({ value: '', label: 'No brand' });
    expect(BRAND_OPTIONS.at(-1)).toEqual({ value: OTHER_BRAND, label: 'Other (type a name)…' });
    expect(BRAND_OPTIONS).toHaveLength(SHOP_BRANDS.length + 2);
  });
});

describe('the countries', () => {
  it('lists the 22 Arab countries once each', () => {
    expect(ARAB_COUNTRY_CODES).toHaveLength(22);
    expect(new Set(ARAB_COUNTRY_CODES).size).toBe(22);
    for (const code of ['JO', 'EG', 'SA', 'AE', 'PS', 'MA', 'IQ']) expect(ARAB_COUNTRY_CODES).toContain(code);
  });

  it('offers no country first, then the Arab countries by name', () => {
    const options = countryOptions('');
    expect(options).toHaveLength(23);
    expect(options[0]).toEqual({ value: '', label: 'No country' });
    const names = options.slice(1).map((option) => option.label);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
    expect(options).toContainEqual({ value: 'JO', label: 'Jordan' });
    expect(options).toContainEqual({ value: 'EG', label: 'Egypt' });
  });

  it('keeps a country saved before selectable when it is not an Arab country', () => {
    expect(countryOptions('JO')).toHaveLength(23);
    const withSaved = countryOptions('gb');
    expect(withSaved).toHaveLength(24);
    expect(withSaved.at(-1)).toEqual({ value: 'GB', label: 'United Kingdom (saved before)' });
    // Text that is not a code adds nothing.
    expect(countryOptions('United Kingdom')).toHaveLength(23);
  });
});
