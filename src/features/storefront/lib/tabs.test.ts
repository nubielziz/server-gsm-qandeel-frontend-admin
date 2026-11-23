// Tests for the tab list: which tabs exist, which permission opens each, and how an address names one.
import { describe, expect, it } from 'vitest';
import { hasPermission } from '@/lib/auth/permissions';
import { DEFAULT_TAB, isStorefrontTab, PAGE_PERMISSIONS, STOREFRONT_TABS } from './tabs';

describe('STOREFRONT_TABS', () => {
  it('lists the demo’s Landing pages, Content and legal and Help centre, then the TAC catalogue and Search', () => {
    expect(STOREFRONT_TABS.map((tab) => tab.label)).toEqual([
      'Landing pages',
      'Content and legal',
      'Help centre',
      'TAC catalogue',
      'Search',
    ]);
    expect(DEFAULT_TAB).toBe('landing');
    expect(STOREFRONT_TABS[0].id).toBe(DEFAULT_TAB);
  });

  it('is opened by any one of the page permissions, and by nothing else', () => {
    expect(PAGE_PERMISSIONS).toEqual(['storefront:read', 'legal:read', 'catalog:read']);
    const opens = (granted: string[]) =>
      STOREFRONT_TABS.filter((tab) => tab.anyOf.some((permission) => hasPermission(granted, permission))).map(
        (tab) => tab.id,
      );
    expect(opens(['legal:read'])).toEqual(['content']);
    expect(opens(['catalog:read'])).toEqual(['tac']);
    expect(opens(['storefront:read'])).toEqual(['landing', 'content', 'help', 'search']);
    expect(opens(['storefront:*', 'catalog:*'])).toHaveLength(5);
    // The parts that moved to the Product / Services page no longer open this page: pricing and publishing have no tab here.
    expect(opens(['pricing:read'])).toEqual([]);
    expect(opens(['storefront:create'])).toEqual([]);
    expect(opens(['orders:read'])).toEqual([]);
  });

  it('opens every tab with a permission the page lets in', () => {
    for (const tab of STOREFRONT_TABS) {
      expect(
        tab.anyOf.some((permission) => (PAGE_PERMISSIONS as readonly string[]).includes(permission)),
      ).toBe(true);
    }
    expect(PAGE_PERMISSIONS).not.toContain('pricing:read');
  });
});

describe('isStorefrontTab', () => {
  it('accepts a tab id and nothing else, so the three tabs that moved read as unknown', () => {
    expect(isStorefrontTab('landing')).toBe(true);
    expect(isStorefrontTab('help')).toBe(true);
    expect(isStorefrontTab('search')).toBe(true);
    expect(isStorefrontTab('listings')).toBe(false);
    expect(isStorefrontTab('pricing')).toBe(false);
    expect(isStorefrontTab('publish')).toBe(false);
    expect(isStorefrontTab('preview')).toBe(false);
    expect(isStorefrontTab(null)).toBe(false);
  });
});
