// Tests for the tab list: which permissions each tab needs, and what the page accepts from the address.
import { describe, expect, it } from 'vitest';
import { hasPermission } from '@/lib/auth/permissions';
import { DEFAULT_TAB, isServicesTab, PAGE_PERMISSIONS, SERVICES_TABS } from './tabs';

describe('tabs', () => {
  it('are the demo’s three and the map’s two, in order', () => {
    expect(SERVICES_TABS.map((tab) => tab.label)).toEqual([
      'Services',
      'Price resolver',
      'Rules and groups',
      'Categories',
      'Code inventory',
    ]);
    expect(DEFAULT_TAB).toBe('services');
  });

  it('need the permissions of their routes: the resolver reads prices and lists services', () => {
    const needs = Object.fromEntries(SERVICES_TABS.map((tab) => [tab.id, tab.permissions]));
    expect(needs.resolver).toEqual(['pricing:read', 'catalog:read']);
    expect(needs.inventory).toEqual(['inventory:read']);
  });

  it('are all covered by the page permission, so any tab’s reader can open the page', () => {
    for (const tab of SERVICES_TABS) {
      expect(PAGE_PERMISSIONS.some((permission) => tab.permissions.includes(permission))).toBe(true);
      expect(hasPermission([tab.permissions[0]], PAGE_PERMISSIONS)).toBe(true);
    }
  });

  it('knows a tab from the address', () => {
    expect(isServicesTab('rules')).toBe(true);
    expect(isServicesTab('orders')).toBe(false);
    expect(isServicesTab(null)).toBe(false);
  });
});
