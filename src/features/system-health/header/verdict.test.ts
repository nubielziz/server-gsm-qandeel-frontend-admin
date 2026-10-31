// Tests for the verdict words: tone and headline per status, the "since" text, broken components worst first and the
// operational count.
import { describe, expect, it } from 'vitest';
import type { AlertSummary, CheckStatus, HealthComponent, Measure, SystemHealth } from '../types';
import {
  STATUS_UNAVAILABLE,
  alertName,
  brokenComponents,
  namedAlerts,
  openAlertsText,
  operationalText,
  seeLink,
  verdictLook,
} from './verdict';

const LATENCY: Measure = { value: 120, unit: 'ms', state: 'ok' };
const UPTIME: Measure = { value: 99.9, unit: 'percent', state: 'ok' };

function component(
  key: string,
  name: string,
  status: CheckStatus,
  kind: HealthComponent['kind'] = 'core',
): HealthComponent {
  return {
    key,
    name,
    kind,
    status,
    since: null,
    latency: LATENCY,
    uptime: { h24: UPTIME, d7: UPTIME, d30: UPTIME },
    lastCheckedAt: null,
    detail: null,
    supplierId: null,
    gatewayId: null,
  };
}

describe('verdictLook', () => {
  it('is good for Operational, warn for Degraded and critical for Outage, each with an icon and a word', () => {
    expect(verdictLook('operational', false)).toEqual({
      tone: 'good',
      icon: 'checkCircle',
      word: 'Operational',
    });
    expect(verdictLook('degraded', false)).toEqual({ tone: 'warn', icon: 'alert', word: 'Degraded' });
    expect(verdictLook('outage', false)).toEqual({ tone: 'crit', icon: 'xCircle', word: 'Outage' });
  });

  it('does not draw Operational green while monitoring is down: no data is never healthy', () => {
    expect(verdictLook('operational', true)).toEqual({
      tone: 'neutral',
      icon: 'info',
      word: 'Monitoring unavailable',
    });
    expect(verdictLook('outage', true)).toEqual({ tone: 'crit', icon: 'xCircle', word: 'Outage' });
  });

  it('is neutral, never green, when the status is unknown, and says whether monitoring is the reason', () => {
    expect(verdictLook('unknown', true)).toEqual({
      tone: 'neutral',
      icon: 'info',
      word: 'Monitoring unavailable',
    });
    expect(verdictLook('unknown', false)).toEqual({ tone: 'neutral', icon: 'info', word: 'Status unknown' });
  });

  it('shows a status it does not know as neutral text', () => {
    // @ts-expect-error The contract is assumed: the server may send a value the console has no word for.
    expect(verdictLook('maintenance', false)).toEqual({ tone: 'neutral', icon: 'info', word: 'maintenance' });
  });

  it('has a neutral look for a failed health call', () => {
    expect(STATUS_UNAVAILABLE).toEqual({ tone: 'neutral', icon: 'info', word: 'Status unavailable' });
  });
});

describe('brokenComponents', () => {
  it('lists Down before Degraded and keeps the server order inside each group', () => {
    const list = brokenComponents([
      component('api', 'API', 'degraded'),
      component('redis', 'Redis', 'ok'),
      component('supplier:3', 'Rapid IMEI', 'down', 'supplier'),
      component('postgres', 'Postgres', 'down'),
    ]);
    expect(list.map((item) => [item.key, item.status])).toEqual([
      ['supplier:3', 'down'],
      ['postgres', 'down'],
      ['api', 'degraded'],
    ]);
  });

  it('names suppliers and gateways with their kind, and core services by name alone', () => {
    const list = brokenComponents([
      component('supplier:3', 'Rapid IMEI', 'down', 'supplier'),
      component('gateway:1', 'Card gateway', 'degraded', 'gateway'),
      component('postgres', 'Postgres', 'down'),
    ]);
    expect(list.map((item) => item.label)).toEqual([
      'Rapid IMEI (supplier)',
      'Postgres',
      'Card gateway (gateway)',
    ]);
  });

  it('leaves out components that are fine or have no data', () => {
    expect(
      brokenComponents([component('redis', 'Redis', 'ok'), component('mail', 'Mail', 'unknown')]),
    ).toEqual([]);
  });
});

describe('operationalText', () => {
  it('says all of them when every component is ok', () => {
    expect(operationalText([component('a', 'A', 'ok'), component('b', 'B', 'ok')])).toBe(
      'All 2 components operational',
    );
    expect(operationalText([component('a', 'A', 'ok')])).toBe('1 component operational');
  });

  it('counts only the components the server marked ok', () => {
    expect(
      operationalText([component('a', 'A', 'ok'), component('b', 'B', 'unknown'), component('c', 'C', 'ok')]),
    ).toBe('2 of 3 components operational');
  });

  it('is empty without components', () => {
    expect(operationalText([])).toBeNull();
  });
});

describe('openAlertsText', () => {
  it('writes the count with its noun', () => {
    expect(openAlertsText(1)).toBe('1 open alert');
    expect(openAlertsText(3)).toBe('3 open alerts');
  });
});

describe('namedAlerts and alertName', () => {
  const alert = (id: number, severity: AlertSummary['severity'], ruleName: string): AlertSummary => ({
    id,
    ruleName,
    severity,
    status: 'firing',
    subjectLabel: id === 1 ? 'client_wallet:4' : null,
    startedAt: null,
  });

  it('puts critical first, then warning, then info, keeping the server order inside each, and counts the rest', () => {
    const items = [alert(3, 'info', 'Disk'), alert(2, 'warning', 'Latency'), alert(1, 'critical', 'Ledger')];
    expect(namedAlerts(items)).toEqual({ shown: [items[2], items[1]], more: 1 });
    expect(namedAlerts(items, 5).more).toBe(0);
    expect(namedAlerts([])).toEqual({ shown: [], more: 0 });
  });

  it('names an alert by its rule and, when it has one, its subject', () => {
    expect(alertName({ ruleName: 'Ledger mismatch', subjectLabel: 'client_wallet:4' })).toBe(
      'Ledger mismatch (client_wallet:4)',
    );
    expect(alertName({ ruleName: 'Ledger mismatch', subjectLabel: null })).toBe('Ledger mismatch');
  });
});

describe('seeLink', () => {
  const summary = (open: number | null, incidents: number) =>
    ({
      alerts: { open: { value: open, unit: 'count', state: 'ok' } },
      incidents: Array.from({ length: incidents }, (_, id) => ({ id })),
    }) as unknown as Pick<SystemHealth, 'alerts' | 'incidents'>;
  const everything = () => true;

  it('points to the alerts when something is open and the staff member may read them', () => {
    expect(seeLink(summary(2, 1), everything)).toEqual({
      to: '/system-health?tab=alerts',
      label: 'See alerts',
    });
  });

  it('points to the incidents when no alert is open but an incident is ongoing', () => {
    expect(seeLink(summary(0, 1), everything)).toEqual({
      to: '/system-health?tab=alerts&view=incidents',
      label: 'See incidents',
    });
  });

  it('falls back to the incidents when the alerts may not be read', () => {
    expect(seeLink(summary(2, 1), (permission) => permission === 'incidents:read')?.label).toBe(
      'See incidents',
    );
  });

  it('is empty when nothing is open, the count is unknown, or the role may read neither', () => {
    expect(seeLink(summary(0, 0), everything)).toBeNull();
    expect(seeLink(summary(null, 0), everything)).toBeNull();
    expect(seeLink(summary(3, 2), () => false)).toBeNull();
  });
});
