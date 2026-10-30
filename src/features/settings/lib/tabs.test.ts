// Tests for the tab list: ids, the address helper, and the page permission.
import { describe, expect, it } from 'vitest';
import { isSettingsTab, PAGE_PERMISSIONS, settingsPath, SETTINGS_TABS } from './tabs';

describe('the tabs', () => {
  it('has the demo’s four tabs first and the three the map adds after them', () => {
    expect(SETTINGS_TABS.map((tab) => tab.id)).toEqual([
      'payments',
      'tax',
      'policies',
      'notifications',
      'log',
      'webhooks',
      'system',
    ]);
  });

  it('opens the page for any one of the five read permissions, and every tab needs one of them or settings:update', () => {
    expect(PAGE_PERMISSIONS).toEqual([
      'settings:read',
      'payments:gateways',
      'tax:read',
      'notifications:read',
      'webhooks:read',
    ]);
    const allowed: readonly string[] = [...PAGE_PERMISSIONS, 'settings:update'];
    for (const tab of SETTINGS_TABS)
      expect(tab.permissions.some((permission) => allowed.includes(permission))).toBe(true);
  });

  it('knows its own ids', () => {
    expect(isSettingsTab('tax')).toBe(true);
    expect(isSettingsTab('nope')).toBe(false);
    expect(isSettingsTab(null)).toBe(false);
  });

  it('builds the address of a tab, leaving the default tab bare', () => {
    expect(settingsPath()).toBe('/settings');
    expect(settingsPath('payments')).toBe('/settings');
    expect(settingsPath('tax')).toBe('/settings?tab=tax');
  });
});
