// Tests for the tab list and the address helper of the System health page.
import { describe, expect, it } from 'vitest';
import { hasPermission } from '@/lib/auth/permissions';
import { DEFAULT_HEALTH_TAB, HEALTH_PATH, HEALTH_TABS, healthPath, isHealthTab } from './healthTabs';

describe('HEALTH_TABS', () => {
  it('lists the seven tabs in the order of the design', () => {
    expect(HEALTH_TABS.map((tab) => tab.id)).toEqual([
      'overview',
      'api',
      'orders',
      'queues',
      'alerts',
      'stores',
      'integrity',
    ]);
    expect(HEALTH_TABS.map((tab) => tab.label)).toEqual([
      'Overview',
      'API',
      'Orders & suppliers',
      'Queues & jobs',
      'Alerts & incidents',
      'Data stores',
      'Integrity',
    ]);
  });

  it('shows the Alerts tab to alerts or incidents readers and every other tab to system readers', () => {
    const alerts = HEALTH_TABS.find((tab) => tab.id === 'alerts');
    expect(alerts?.permissions).toEqual(['alerts:read', 'incidents:read']);
    for (const tab of HEALTH_TABS.filter((candidate) => candidate.id !== 'alerts')) {
      expect(tab.permissions).toEqual(['system:read']);
    }
  });

  it('opens a tab for any one of its permissions, and for an owner', () => {
    expect(hasPermission(['incidents:read'], HEALTH_TABS[4].permissions)).toBe(true);
    expect(hasPermission(['system:read'], HEALTH_TABS[4].permissions)).toBe(false);
    expect(hasPermission(['*'], HEALTH_TABS[0].permissions)).toBe(true);
  });
});

describe('isHealthTab', () => {
  it('accepts the tab ids and nothing else', () => {
    expect(isHealthTab('queues')).toBe(true);
    expect(isHealthTab('Queues')).toBe(false);
    expect(isHealthTab('')).toBe(false);
    expect(isHealthTab(null)).toBe(false);
  });
});

describe('healthPath', () => {
  it('is the bare page for the default tab, with or without a name', () => {
    expect(healthPath()).toBe(HEALTH_PATH);
    expect(healthPath(DEFAULT_HEALTH_TAB)).toBe('/system-health');
  });

  it('names any other tab', () => {
    expect(healthPath('alerts')).toBe('/system-health?tab=alerts');
  });

  it('adds the parameters the tab reads, in the order given', () => {
    expect(healthPath('alerts', { view: 'incidents', incident: 5 })).toBe(
      '/system-health?tab=alerts&view=incidents&incident=5',
    );
    expect(healthPath('overview', { component: 'supplier:3' })).toBe('/system-health?component=supplier%3A3');
  });

  it('leaves out parameters that are empty, false, null or missing', () => {
    expect(healthPath('queues', { queue: '', job: undefined, page: null, paused: false })).toBe(
      '/system-health?tab=queues',
    );
    expect(healthPath('queues', { paused: true })).toBe('/system-health?tab=queues&paused=true');
  });
});
