// Tests for the Catalog page's views and settings tabs: which permissions each one needs, which view a role falls back to, and the
// addresses the views write and read.
import { describe, expect, it } from 'vitest';
import { hasPermission } from '@/lib/auth/permissions';
import { catalogPath } from './paths';
import {
  isSettingsTab,
  PAGE_PERMISSIONS,
  parseRunId,
  parseView,
  resolveView,
  SETTINGS_TABS,
  viewAccess,
  viewLink,
} from './tabs';

/** The views a role may use, from its permission list (as the page computes them). */
function accessOf(permissions: string[]) {
  const can = (permission: string) => hasPermission(permissions, permission);
  const tabs = SETTINGS_TABS.filter((tab) => tab.permissions.every(can));
  return viewAccess(can, tabs.length);
}

describe('settings tabs', () => {
  it('are the categories, the two kinds of price rules, the resolver and the code stock, in order', () => {
    expect(SETTINGS_TABS.map((tab) => [tab.id, tab.label])).toEqual([
      ['categories', 'Categories'],
      ['rules', 'Merchant price rules'],
      ['shop-prices', 'Shop price rules'],
      ['resolver', 'Price resolver'],
      ['inventory', 'Code inventory'],
    ]);
  });

  it('need the permissions of their routes: the resolver reads prices and lists services', () => {
    const needs = Object.fromEntries(SETTINGS_TABS.map((tab) => [tab.id, tab.permissions]));
    expect(needs).toEqual({
      categories: ['catalog:read'],
      rules: ['pricing:read'],
      'shop-prices': ['pricing:read'],
      resolver: ['pricing:read', 'catalog:read'],
      inventory: ['inventory:read'],
    });
  });

  it('are known from the address', () => {
    expect(isSettingsTab('shop-prices')).toBe(true);
    expect(isSettingsTab('services')).toBe(false);
    expect(isSettingsTab(null)).toBe(false);
  });
});

describe('the page permission', () => {
  it('is any of the reads that open a view (the gate the feature manifest declares)', () => {
    expect(PAGE_PERMISSIONS).toEqual(['catalog:read', 'pricing:read', 'inventory:read', 'storefront:read']);
  });

  it('lets every role it admits use at least one view', () => {
    for (const permission of PAGE_PERMISSIONS) {
      expect(resolveView('table', accessOf([permission]))).not.toBeNull();
    }
  });
});

describe('the view a role opens', () => {
  it('is the one the address names when the role may use it', () => {
    expect(resolveView('settings', accessOf(['*']))).toBe('settings');
    expect(resolveView('publish', accessOf(['catalog:read', 'storefront:read']))).toBe('publish');
  });

  it('falls back to the table, then the settings, then the publish runs', () => {
    expect(resolveView('publish', accessOf(['catalog:read']))).toBe('table');
    expect(resolveView('table', accessOf(['inventory:read', 'storefront:read']))).toBe('settings');
    expect(resolveView('table', accessOf(['pricing:read']))).toBe('settings');
    expect(resolveView('settings', accessOf(['storefront:read']))).toBe('publish');
    expect(resolveView('table', accessOf(['orders:read']))).toBeNull();
  });

  it('never is the table without catalog:read', () => {
    expect(accessOf(['pricing:read', 'inventory:read', 'storefront:read']).table).toBe(false);
    expect(accessOf(['catalog:*']).table).toBe(true);
  });
});

describe('addresses', () => {
  it('read the view, defaulting to the table', () => {
    const view = (query: string) => parseView(new URLSearchParams(query));
    expect(view('view=settings&tab=rules')).toBe('settings');
    expect(view('view=publish&run=3')).toBe('publish');
    expect(view('')).toBe('table');
    expect(view('view=tab&q=unlock')).toBe('table');
  });

  it('read a settings tab named without a view as the settings, never as the table', () => {
    const view = (query: string) => parseView(new URLSearchParams(query));
    expect(view('tab=resolver&service=9')).toBe('settings');
    expect(view('tab=services&q=unlock')).toBe('table');
    expect(view('view=publish&tab=rules')).toBe('publish');
  });

  it('open a view clean, with the view alone (the address a fallback writes)', () => {
    expect(catalogPath(viewLink('table'))).toBe('/catalog');
    expect(catalogPath(viewLink('settings'))).toBe('/catalog?view=settings');
    expect(catalogPath(viewLink('publish'))).toBe('/catalog?view=publish');
  });

  it('read back every settings tab the address builder writes', () => {
    for (const { id } of SETTINGS_TABS) {
      const params = new URL(catalogPath({ view: 'settings', tab: id }), 'http://localhost').searchParams;
      expect([parseView(params), params.get('tab')]).toEqual(['settings', id]);
    }
  });

  it('read a run id only when it is a positive whole number', () => {
    expect(parseRunId('12')).toBe(12);
    expect(parseRunId(null)).toBeNull();
    expect(parseRunId('0')).toBeNull();
    expect(parseRunId('-3')).toBeNull();
    expect(parseRunId('1.5')).toBeNull();
    expect(parseRunId('99999999999999999999')).toBeNull();
  });
});
