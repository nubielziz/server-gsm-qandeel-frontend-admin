// Tests for the tab list: which tabs exist, which permission opens each, and how an address names one.
import { describe, expect, it } from 'vitest';
import { hasPermission } from '@/lib/auth/permissions';
import { DEFAULT_TAB, isStorefrontTab, PAGE_PERMISSIONS, STOREFRONT_TABS } from './tabs';

describe('STOREFRONT_TABS', () => {
  it('lists Content and legal, Help centre and Search, the Landing pages and TAC catalogue tabs being retired', () => {
    expect(STOREFRONT_TABS.map((tab) => tab.label)).toEqual(['Content and legal', 'Help centre', 'Search']);
    expect(DEFAULT_TAB).toBe('content');
    expect(STOREFRONT_TABS[0].id).toBe(DEFAULT_TAB);
  });

  it('is opened by any one of the page permissions, and by nothing else', () => {
    expect(PAGE_PERMISSIONS).toEqual(['storefront:read', 'legal:read']);
    const opens = (granted: string[]) =>
      STOREFRONT_TABS.filter((tab) => tab.anyOf.some((permission) => hasPermission(granted, permission))).map(
        (tab) => tab.id,
      );
    expect(opens(['legal:read'])).toEqual(['content']);
    expect(opens(['storefront:read'])).toEqual(['content', 'help', 'search']);
    expect(opens(['storefront:*', 'legal:*'])).toHaveLength(3);
    // The TAC catalogue was the one tab that catalog:read opened; the permission now opens nothing here.
    expect(opens(['catalog:read'])).toEqual([]);
    expect(opens(['catalog:*'])).toEqual([]);
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
    expect(PAGE_PERMISSIONS).not.toContain('catalog:read');
  });
});

describe('isStorefrontTab', () => {
  it('accepts a tab id and nothing else, so the tabs that moved or were retired read as unknown', () => {
    expect(isStorefrontTab('content')).toBe(true);
    expect(isStorefrontTab('help')).toBe(true);
    expect(isStorefrontTab('search')).toBe(true);
    expect(isStorefrontTab('landing')).toBe(false);
    expect(isStorefrontTab('tac')).toBe(false);
    expect(isStorefrontTab('listings')).toBe(false);
    expect(isStorefrontTab('pricing')).toBe(false);
    expect(isStorefrontTab('publish')).toBe(false);
    expect(isStorefrontTab('preview')).toBe(false);
    expect(isStorefrontTab(null)).toBe(false);
  });
});
