// Tests for the tab list: which tabs exist, which permission opens each, and how an address names one.
import { describe, expect, it } from 'vitest';
import { hasPermission } from '@/lib/auth/permissions';
import { DEFAULT_TAB, isStorefrontTab, PAGE_PERMISSIONS, STOREFRONT_TABS } from './tabs';

describe('STOREFRONT_TABS', () => {
  it('lists the demo’s four tabs in its order, then the TAC catalogue', () => {
    expect(STOREFRONT_TABS.map((tab) => tab.label)).toEqual([
      'Services on sale',
      'Landing pages',
      'Content and legal',
      'Help centre',
      'TAC catalogue',
    ]);
    expect(DEFAULT_TAB).toBe('listings');
  });

  it('is opened by any one of the page permissions', () => {
    expect(PAGE_PERMISSIONS).toEqual(['storefront:read', 'legal:read', 'catalog:read']);
    const opens = (granted: string[]) =>
      STOREFRONT_TABS.filter((tab) => tab.anyOf.some((permission) => hasPermission(granted, permission))).map(
        (tab) => tab.id,
      );
    expect(opens(['legal:read'])).toEqual(['content']);
    expect(opens(['catalog:read'])).toEqual(['tac']);
    expect(opens(['storefront:read'])).toEqual(['listings', 'landing', 'content', 'help']);
    expect(opens(['storefront:*', 'catalog:*'])).toHaveLength(5);
    expect(opens(['orders:read'])).toEqual([]);
  });
});

describe('isStorefrontTab', () => {
  it('accepts a tab id and nothing else', () => {
    expect(isStorefrontTab('help')).toBe(true);
    expect(isStorefrontTab('preview')).toBe(false);
    expect(isStorefrontTab(null)).toBe(false);
  });
});
