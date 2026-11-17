// Tests for the tab list: which tabs exist, which permission opens each, and how an address names one.
import { describe, expect, it } from 'vitest';
import { hasPermission } from '@/lib/auth/permissions';
import { DEFAULT_TAB, isStorefrontTab, PAGE_PERMISSIONS, STOREFRONT_TABS } from './tabs';

describe('STOREFRONT_TABS', () => {
  it('lists the demo’s four tabs in its order with Retail pricing after the listings, then the TAC catalogue and Search', () => {
    expect(STOREFRONT_TABS.map((tab) => tab.label)).toEqual([
      'Services on sale',
      'Retail pricing',
      'Landing pages',
      'Content and legal',
      'Help centre',
      'TAC catalogue',
      'Search',
    ]);
    expect(DEFAULT_TAB).toBe('listings');
  });

  it('is opened by any one of the page permissions', () => {
    expect(PAGE_PERMISSIONS).toEqual(['storefront:read', 'legal:read', 'catalog:read', 'pricing:read']);
    const opens = (granted: string[]) =>
      STOREFRONT_TABS.filter((tab) => tab.anyOf.some((permission) => hasPermission(granted, permission))).map(
        (tab) => tab.id,
      );
    expect(opens(['legal:read'])).toEqual(['content']);
    expect(opens(['catalog:read'])).toEqual(['tac']);
    expect(opens(['storefront:read'])).toEqual(['listings', 'landing', 'content', 'help', 'search']);
    expect(opens(['pricing:read'])).toEqual(['pricing']);
    expect(opens(['storefront:*', 'catalog:*'])).toHaveLength(6);
    expect(opens(['storefront:*', 'catalog:*', 'pricing:*'])).toHaveLength(7);
    expect(opens(['orders:read'])).toEqual([]);
  });
});

describe('isStorefrontTab', () => {
  it('accepts a tab id and nothing else', () => {
    expect(isStorefrontTab('help')).toBe(true);
    expect(isStorefrontTab('search')).toBe(true);
    expect(isStorefrontTab('pricing')).toBe(true);
    expect(isStorefrontTab('preview')).toBe(false);
    expect(isStorefrontTab(null)).toBe(false);
  });
});
