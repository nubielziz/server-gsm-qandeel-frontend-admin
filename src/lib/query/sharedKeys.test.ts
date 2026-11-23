// Tests for the shared query keys: each is a read-only list that starts with 'api' and names its owner, so prefixes match.
import { describe, expect, it } from 'vitest';
import { CATALOG_ROWS_KEY, DASHBOARD_KEY, LISTING_DETAILS_KEY, MERCHANT_WALLET_KEY } from './sharedKeys';

describe('shared query keys', () => {
  it('keeps the shape of the catalog rows key: api, the catalog, its rows', () => {
    expect(CATALOG_ROWS_KEY).toEqual(['api', 'catalog', 'rows']);
  });

  it('keeps the shape of the listing read key: api, the storefront, its listing', () => {
    expect(LISTING_DETAILS_KEY).toEqual(['api', 'storefront', 'listing']);
  });

  it('gives every shared key its own name, so one never invalidates another by prefix', () => {
    const keys = [CATALOG_ROWS_KEY, DASHBOARD_KEY, LISTING_DETAILS_KEY, MERCHANT_WALLET_KEY];
    for (const key of keys) {
      expect(key[0]).toBe('api');
      expect(key.every((part) => typeof part === 'string' && part.length > 0)).toBe(true);
    }
    const joined = keys.map((key) => key.join('/'));
    for (const [index, name] of joined.entries()) {
      expect(joined.filter((other, at) => at !== index && other.startsWith(name))).toEqual([]);
    }
  });
});
