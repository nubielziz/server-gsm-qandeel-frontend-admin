// Tests of the System health mock per scenario: the verdict and what is open in each, and the reads that answer 503
// or 500 (the six KPI states and the invariants of every Measure are in kpi.test.ts).
import { describe, expect, it } from 'vitest';
import { apiGet } from '@/lib/api';
import { setMockScenario } from '@/mocks/scenario';
import type {
  DatabaseHealth,
  IntegrityReport,
  OrdersHealth,
  QueuesResponse,
  SuppliersHealth,
  SystemHealth,
  WebhooksHealth,
} from '../types';
import { failure, setupHealthMocks } from './testing';

setupHealthMocks();

const health = () => apiGet<SystemHealth>('/admin/system/health');

describe('healthy', () => {
  it('is operational with nothing open and every component ok', async () => {
    setMockScenario('healthy');
    const result = await health();
    expect(result).toMatchObject({
      status: 'operational',
      monitoring: { status: 'available', detail: null },
      maintenance: { enabled: false },
      alerts: { critical: 0, items: [] },
      incidents: [],
      build: { version: 'v1.42.0', environment: 'production' },
    });
    expect(result.alerts.open).toMatchObject({ value: 0, state: 'ok' });
    expect(result.components).toHaveLength(14);
    expect(result.components.every((component) => component.status === 'ok')).toBe(true);
    expect(new Set(result.components.map((component) => component.kind))).toEqual(
      new Set(['core', 'supplier', 'gateway']),
    );
    // "Operational since" the end of the last incident.
    expect(Date.parse(result.since ?? '')).toBeLessThan(Date.now() - 24 * 3_600_000);
  });

  it('has 30 daily uptime points and the three windows', async () => {
    setMockScenario('healthy');
    const { uptime } = await health();
    expect(uptime.daily).toHaveLength(30);
    expect([uptime.h24.state, uptime.d7.state, uptime.d30.state]).toEqual(['ok', 'ok', 'ok']);
    expect(uptime.d30).toMatchObject({ unit: 'percent', warn: 99.9, crit: 99.5, direction: 'below' });
  });
});

describe('degraded', () => {
  it('has one supplier down, a critical alert firing and an incident open', async () => {
    setMockScenario('degraded');
    const result = await health();
    expect(result.status).toBe('degraded');
    const down = result.components.filter((component) => component.status !== 'ok');
    expect(down).toHaveLength(1);
    expect(down[0]).toMatchObject({
      key: 'supplier:3',
      kind: 'supplier',
      status: 'down',
      supplierId: 3,
      detail: 'timeout after 6000 ms',
    });
    expect(down[0].latency).toMatchObject({ state: 'crit', unit: 'ms' });
    expect(result.alerts).toMatchObject({ critical: 1 });
    expect(result.alerts.open).toMatchObject({ value: 2, state: 'crit' });
    expect(result.alerts.items.map((alert) => alert.status)).toEqual(['firing', 'firing']);
    expect(result.incidents).toHaveLength(1);
    expect(result.incidents[0]).toMatchObject({
      title: 'Supplier timeouts',
      severity: 'major',
      status: 'identified',
    });
    // The trouble began about 38 minutes ago.
    const minutes = (Date.now() - Date.parse(result.since ?? '')) / 60_000;
    expect(minutes).toBeGreaterThan(36);
    expect(minutes).toBeLessThan(42);
  });

  it('slows the supplier in the supplier table and opens its circuit', async () => {
    setMockScenario('degraded');
    const { suppliers } = await apiGet<SuppliersHealth>('/admin/system/suppliers');
    const slow = suppliers.find((supplier) => supplier.id === 3);
    expect(slow).toMatchObject({ health: 'down', circuit: 'open', status: 'active' });
    expect(slow?.timeoutRate.state).toBe('crit');
    expect(suppliers.filter((supplier) => supplier.health !== 'ok')).toHaveLength(1);
  });

  it('has 23 orders past SLA holding $1,240.00', async () => {
    setMockScenario('degraded');
    const orders = await apiGet<OrdersHealth>('/admin/system/orders-health');
    expect(orders.stuck.total).toMatchObject({ value: 23, state: 'crit' });
    expect(orders.stuck.heldAmount).toBe('1240.0000');
    expect(orders.stuck.byStatus.reduce((sum, row) => sum + row.count, 0)).toBe(23);
    // 4m 10s, give or take the minute's wobble
    expect(orders.dispatchP95.state).toBe('warn');
    expect(orders.dispatchP95.value).toBeGreaterThan(230);
    expect(orders.dispatchP95.value).toBeLessThan(270);
  });
});

describe('outage', () => {
  it('has the database down and the verdict outage', async () => {
    setMockScenario('outage');
    const result = await health();
    expect(result.status).toBe('outage');
    expect(result.components.find((component) => component.key === 'postgres')).toMatchObject({
      status: 'down',
      detail: 'FATAL: sorry, too many clients already',
    });
    expect(result.incidents[0]).toMatchObject({ severity: 'critical' });
    const database = await apiGet<DatabaseHealth>('/admin/system/database');
    expect(database.status).toBe('down');
    expect(database.connections.usage.state).toBe('crit');
    expect(database.replicaLag).toMatchObject({ value: null, state: 'unknown' });
  });

  it('answers 503 DATABASE_UNAVAILABLE for the order and integrity reads', async () => {
    setMockScenario('outage');
    for (const path of ['/admin/system/orders-health', '/admin/system/integrity']) {
      const error = await failure(apiGet(path));
      expect(error).toMatchObject({ status: 503, code: 'DATABASE_UNAVAILABLE' });
      expect(error.requestId).toBeTruthy();
    }
    // The reads that do not need the database still work.
    await expect(apiGet<QueuesResponse>('/admin/system/queues')).resolves.toBeTruthy();
  });
});

describe('monitoring-down', () => {
  it('says monitoring is unavailable and the status is unknown, never operational', async () => {
    setMockScenario('monitoring-down');
    const result = await health();
    expect(result.status).toBe('unknown');
    expect(result.monitoring).toMatchObject({ status: 'unavailable' });
    expect(result.monitoring.detail).toContain('Prometheus');
    // With no way to evaluate the rules, the open-alert count is "no data", not zero.
    expect(result.alerts.open).toMatchObject({ value: null, state: 'unknown' });
    expect(result.alerts.trend.every((point) => point.value === null)).toBe(true);
  });

  it('answers 503 MONITORING_UNAVAILABLE for metrics and errors', async () => {
    setMockScenario('monitoring-down');
    for (const path of ['/admin/system/metrics', '/admin/system/errors']) {
      const error = await failure(apiGet(path, { range: '24h' }));
      expect(error).toMatchObject({ status: 503, code: 'MONITORING_UNAVAILABLE' });
    }
    // What does not depend on Prometheus keeps working.
    await expect(apiGet<WebhooksHealth>('/admin/system/webhooks')).resolves.toBeTruthy();
  });
});

describe('partial-failure', () => {
  it('fails only the queues read, with a 500', async () => {
    setMockScenario('partial-failure');
    const error = await failure(apiGet('/admin/system/queues'));
    expect(error).toMatchObject({ status: 500, code: 'INTERNAL_ERROR' });
    expect((await health()).status).toBe('operational');
    const others: [string, Record<string, string> | undefined][] = [
      ['/admin/system/checks', undefined],
      ['/admin/system/metrics', { range: '24h' }],
      ['/admin/system/errors', { range: '24h' }],
      ['/admin/system/orders-health', undefined],
      ['/admin/system/suppliers', undefined],
      ['/admin/system/jobs', undefined],
      ['/admin/system/webhooks', undefined],
      ['/admin/system/database', undefined],
      ['/admin/system/cache', undefined],
      ['/admin/system/integrity', undefined],
    ];
    for (const [path, query] of others) await expect(apiGet(path, query)).resolves.toBeTruthy();
  });
});

describe('maintenance', () => {
  it('has checkout maintenance on and a critical ledger alert acknowledged', async () => {
    setMockScenario('maintenance');
    const result = await health();
    expect(result.status).toBe('degraded');
    expect(result.maintenance).toMatchObject({
      enabled: true,
      scope: 'checkout',
      startedBy: { name: 'Dana M.' },
    });
    expect(result.maintenance.message).toContain('Checkout is paused');
    expect(Date.parse(result.maintenance.expectedEndAt ?? '')).toBeGreaterThan(Date.now());
    expect(result.alerts.open).toMatchObject({ value: 1, state: 'crit' });
    expect(result.alerts.items[0]).toMatchObject({ ruleName: 'Ledger mismatch', status: 'acknowledged' });
    expect(result.incidents).toEqual([]);
  });

  it('fails the account check of the last integrity run', async () => {
    setMockScenario('maintenance');
    const report = await apiGet<IntegrityReport>('/admin/system/integrity');
    expect(report.running).toBe(false);
    expect(report.lastRun).toMatchObject({ job: 'ledger_integrity', trigger: 'manual', status: 'succeeded' });
    const failed = report.checks.filter((check) => check.status === 'fail');
    expect(failed.map((check) => check.key)).toEqual(['accounts_match_lines']);
    expect(failed[0]).toMatchObject({ count: 1, difference: '-37.5000' });
    expect(failed[0].findings[0]).toMatchObject({ kind: 'account', ref: 'client_wallet:4' });
    // The last clean pass came before the run that found the difference.
    expect(Date.parse(report.lastSuccessAt ?? '')).toBeLessThan(Date.parse(report.lastRun?.startedAt ?? ''));
    const database = await apiGet<DatabaseHealth>('/admin/system/database');
    expect(database.replicaLag).toBeNull();
    expect(database.pendingMigrations).toHaveLength(1);
  });
});

describe('readonly', () => {
  it('shows the degraded data', async () => {
    setMockScenario('readonly');
    const result = await health();
    expect(result.status).toBe('degraded');
    expect(result.components.find((component) => component.key === 'supplier:3')?.status).toBe('down');
  });
});
