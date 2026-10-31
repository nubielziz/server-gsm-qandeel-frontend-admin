// Tests of the System health mock's operational writes: the 403 of a read-only staff member, pausing a queue and
// retrying failed jobs, running a job, the integrity run, and maintenance (on, change, off, and what it refuses).
import { describe, expect, it, vi } from 'vitest';
import { apiDelete, apiGet, apiList, apiPatch, apiPost, apiPut } from '@/lib/api';
import { MOCK_SCENARIOS, setMockScenario } from '@/mocks/scenario';
import type {
  AlertEvent,
  FailedJob,
  IntegrityReport,
  JobRun,
  JobsResponse,
  MaintenanceState,
  QueueStats,
  QueuesResponse,
  SystemHealth,
} from '../types';
import { NEW_RULE, failure, setupHealthMocks } from './testing';

setupHealthMocks();

// A manual run ends 250 ms after it starts; the wait is generous for a busy machine.
const SETTLE = { timeout: 5000, interval: 50 };

describe('a read-only staff member (scenario readonly)', () => {
  const writes: [string, () => Promise<unknown>, string][] = [
    ['maintenance', () => apiPut('/admin/system/maintenance', { enabled: false }), 'system:manage'],
    ['retry', () => apiPost('/admin/system/queues/orders.fetch/retry', { all: true }), 'system:manage'],
    ['pause', () => apiPost('/admin/system/queues/orders.fetch/pause', { paused: false }), 'system:manage'],
    ['run job', () => apiPost('/admin/system/jobs/price_sync/run'), 'system:manage'],
    ['run integrity', () => apiPost('/admin/system/integrity/run'), 'system:manage'],
    ['acknowledge', () => apiPost('/admin/alerts/12/ack', {}), 'alerts:update'],
    ['create rule', () => apiPost('/admin/alert-rules', NEW_RULE), 'alerts:create'],
    ['edit rule', () => apiPatch('/admin/alert-rules/1', { isActive: false }), 'alerts:update'],
    ['delete rule', () => apiDelete('/admin/alert-rules/1'), 'alerts:delete'],
    ['declare incident', () => apiPost('/admin/incidents', {}), 'incidents:create'],
    ['update incident', () => apiPatch('/admin/incidents/5', { title: 'New title' }), 'incidents:update'],
  ];
  for (const [name, call, permission] of writes) {
    it(`answers 403 FORBIDDEN to ${name}, naming ${permission}`, async () => {
      setMockScenario('readonly');
      const error = await failure(call());
      expect(error).toMatchObject({ status: 403, code: 'FORBIDDEN' });
      expect(error.detail).toContain(permission);
    });
  }

  it('changes nothing and still reads everything', async () => {
    setMockScenario('readonly');
    await failure(apiPost('/admin/alerts/12/ack', {}));
    const alerts = await apiList<AlertEvent>('/admin/alerts', { filters: { status: 'firing' } });
    expect(alerts.total).toBe(2);
    expect((await apiGet<SystemHealth>('/admin/system/health')).status).toBe('degraded');
  });

  it('is the only scenario that refuses writes', async () => {
    for (const scenario of MOCK_SCENARIOS.filter((name) => name !== 'readonly')) {
      setMockScenario(scenario);
      await expect(apiPost('/admin/system/jobs/reminders/run')).resolves.toBeTruthy();
    }
  });
});

describe('queues', () => {
  it('pauses with a reason, then resumes; a pause needs the reason', async () => {
    setMockScenario('healthy');
    const missing = await failure(apiPost('/admin/system/queues/notifications/pause', { paused: true }));
    expect(missing).toMatchObject({ status: 422, code: 'VALIDATION_FAILED' });
    expect(Object.keys(missing.fieldErrors)).toEqual(['reason']);
    const badBody = await failure(apiPost('/admin/system/queues/notifications/pause', { reason: 'x' }));
    expect(Object.keys(badBody.fieldErrors)).toEqual(['paused']);

    const paused = await apiPost<QueueStats>('/admin/system/queues/notifications/pause', {
      paused: true,
      reason: 'Telegram is rate limiting us',
    });
    expect(paused).toMatchObject({ name: 'notifications', paused: true, active: 0, state: 'warn' });
    expect(paused.ratePerMin.value).toBe(0);
    const during = (await apiGet<QueuesResponse>('/admin/system/queues')).queues.find(
      (q) => q.name === 'notifications',
    );
    expect(during?.paused).toBe(true);
    expect(
      (await apiGet<QueuesResponse>('/admin/system/queues')).queues.filter((q) => q.paused),
    ).toHaveLength(1);

    const resumed = await apiPost<QueueStats>('/admin/system/queues/notifications/pause', { paused: false });
    expect(resumed).toMatchObject({ paused: false, state: 'ok' });
    expect((await failure(apiPost('/admin/system/queues/nope/pause', { paused: false }))).status).toBe(404);
  });

  it('grows the oldest job of a paused queue while nobody takes jobs', async () => {
    setMockScenario('healthy');
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date('2026-10-31T12:00:00Z'));
      await apiPost('/admin/system/queues/orders.fetch/pause', {
        paused: true,
        reason: 'Supplier maintenance',
      });
      vi.setSystemTime(new Date('2026-10-31T12:03:00Z'));
      const queue = (await apiGet<QueuesResponse>('/admin/system/queues')).queues.find(
        (q) => q.name === 'orders.fetch',
      );
      // Three minutes paused: older than the 2-minute warning limit.
      expect(queue?.oldestAge.value).toBeGreaterThan(180);
      expect(queue?.oldestAge.state).toBe('warn');
    } finally {
      vi.useRealTimers();
    }
  });

  it('lists failed jobs newest first with the total, and retries one or all', async () => {
    setMockScenario('degraded');
    const page = await apiList<FailedJob>('/admin/system/queues/orders.dispatch/failed', {
      start: 0,
      end: 10,
    });
    expect(page.total).toBe(23);
    expect(page.data).toHaveLength(10);
    expect(page.data[0]).toMatchObject({
      failedReason: 'Supplier timeout after 6000 ms (Rapid IMEI)',
      maxAttempts: 5,
    });
    const times = page.data.map((job) => Date.parse(job.failedAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));

    const one = await apiPost<{ retried: number }>('/admin/system/queues/orders.dispatch/retry', {
      jobId: page.data[0].id,
    });
    expect(one).toEqual({ retried: 1 });
    expect((await apiList<FailedJob>('/admin/system/queues/orders.dispatch/failed')).total).toBe(22);
    expect(
      await failure(apiPost('/admin/system/queues/orders.dispatch/retry', { jobId: page.data[0].id })),
    ).toMatchObject({ status: 404 });

    const all = await apiPost<{ retried: number }>('/admin/system/queues/orders.dispatch/retry', {
      all: true,
    });
    expect(all).toEqual({ retried: 22 });
    expect((await apiList<FailedJob>('/admin/system/queues/orders.dispatch/failed')).total).toBe(0);
    const queue = (await apiGet<QueuesResponse>('/admin/system/queues')).queues.find(
      (q) => q.name === 'orders.dispatch',
    );
    expect(queue?.failed).toBe(0);
    expect(await failure(apiPost('/admin/system/queues/orders.dispatch/retry', {}))).toMatchObject({
      status: 422,
    });
    expect((await failure(apiGet('/admin/system/queues/nope/failed'))).status).toBe(404);
  });
});

describe('jobs and the integrity run', () => {
  it('runs a job by hand: running at once, recorded as manual, finished a moment later', async () => {
    setMockScenario('healthy');
    const run = await apiPost<JobRun>('/admin/system/jobs/price_sync/run');
    expect(run).toMatchObject({
      job: 'price_sync',
      trigger: 'manual',
      status: 'running',
      triggeredBy: { name: 'Rami K.' },
    });
    const during = await apiGet<JobsResponse>('/admin/system/jobs', { job: 'price_sync' });
    expect(during.jobs.find((job) => job.name === 'price_sync')?.running).toBe(true);
    expect(during.runs[0]).toMatchObject({ id: run.id, status: 'running' });
    expect(await failure(apiPost('/admin/system/jobs/price_sync/run'))).toMatchObject({
      status: 409,
      code: 'JOB_ALREADY_RUNNING',
    });

    await vi.waitFor(async () => {
      const after = await apiGet<JobsResponse>('/admin/system/jobs', { job: 'price_sync' });
      expect(after.jobs.find((job) => job.name === 'price_sync')).toMatchObject({
        running: false,
        lastRun: { id: run.id, status: 'succeeded', trigger: 'manual' },
      });
    }, SETTLE);
    expect((await failure(apiPost('/admin/system/jobs/nope/run'))).status).toBe(404);
  });

  it('runs the integrity check in the background and ends with the checks passing', async () => {
    setMockScenario('healthy');
    const run = await apiPost<JobRun>('/admin/system/integrity/run');
    expect(run).toMatchObject({ job: 'ledger_integrity', status: 'running', trigger: 'manual' });
    const during = await apiGet<IntegrityReport>('/admin/system/integrity');
    expect(during.running).toBe(true);
    expect(during.lastRun?.id).not.toBe(run.id);
    expect(await failure(apiPost('/admin/system/integrity/run'))).toMatchObject({ status: 409 });

    await vi.waitFor(async () => {
      const after = await apiGet<IntegrityReport>('/admin/system/integrity');
      expect(after.running).toBe(false);
      expect(after.lastRun).toMatchObject({
        id: run.id,
        status: 'succeeded',
        triggeredBy: { name: 'Rami K.' },
      });
      expect(after.checks.every((check) => check.status === 'pass')).toBe(true);
      expect(after.lastSuccessAt).toBe(after.lastRun?.finishedAt);
    }, SETTLE);
  });

  it('keeps the difference after a run: the mock cannot post the reversing entry', async () => {
    setMockScenario('maintenance');
    const before = await apiGet<IntegrityReport>('/admin/system/integrity');
    await apiPost('/admin/system/integrity/run');
    await vi.waitFor(async () => {
      const after = await apiGet<IntegrityReport>('/admin/system/integrity');
      expect(after.running).toBe(false);
      expect(after.lastRun?.id).not.toBe(before.lastRun?.id);
      expect(after.checks.filter((check) => check.status === 'fail')).toHaveLength(1);
      expect(after.lastSuccessAt).toBe(before.lastSuccessAt);
    }, SETTLE);
  });

  it('passes once Finance has posted the reversing entry, and the mismatch alert closes by itself', async () => {
    setMockScenario('maintenance');
    expect((await apiGet<SystemHealth>('/admin/system/health')).alerts.open).toMatchObject({
      value: 1,
      state: 'crit',
    });
    // Finance puts the wallet right: the merchants mock posts the adjustment into the ledger mock.
    await apiPost('/admin/clients/4/wallet/adjust', {
      direction: 'credit',
      amount: 37.5,
      reason: 'Reverse the difference',
    });
    await apiPost('/admin/system/integrity/run');
    await vi.waitFor(async () => {
      const report = await apiGet<IntegrityReport>('/admin/system/integrity');
      expect(report.running).toBe(false);
      expect(report.checks.every((check) => check.status === 'pass')).toBe(true);
      expect(report.lastSuccessAt).toBe(report.lastRun?.finishedAt);
    }, SETTLE);

    const health = await apiGet<SystemHealth>('/admin/system/health');
    expect(health.alerts).toMatchObject({ critical: 0, items: [] });
    expect(health.alerts.open).toMatchObject({ value: 0, state: 'ok' });
    expect(health.status).toBe('operational');
    // Maintenance stays on until staff turn it off.
    expect(health.maintenance.enabled).toBe(true);
    const resolved = await apiList<AlertEvent>('/admin/alerts', {
      filters: { status: 'resolved', q: 'ledger' },
    });
    expect(resolved.data[0]).toMatchObject({ rule: { key: 'ledger_mismatch' }, status: 'resolved' });
    expect(resolved.data[0].resolvedAt).toBeTruthy();
  });

  it('ignores an adjustment on another merchant: the difference stays', async () => {
    setMockScenario('maintenance');
    await apiPost('/admin/clients/1/wallet/adjust', {
      direction: 'credit',
      amount: 5,
      reason: 'Goodwill credit',
    });
    await apiPost('/admin/system/integrity/run');
    await vi.waitFor(async () => {
      const report = await apiGet<IntegrityReport>('/admin/system/integrity');
      expect(report.running).toBe(false);
      expect(report.checks.filter((check) => check.status === 'fail')).toHaveLength(1);
    }, SETTLE);
    expect((await apiGet<SystemHealth>('/admin/system/health')).alerts.open).toMatchObject({
      value: 1,
      state: 'crit',
    });
  });

  it('answers 503 to a run while the database is down', async () => {
    setMockScenario('outage');
    expect(await failure(apiPost('/admin/system/integrity/run'))).toMatchObject({
      status: 503,
      code: 'DATABASE_UNAVAILABLE',
    });
  });
});

describe('maintenance', () => {
  const body = { enabled: true, scope: 'all', message: 'Back at 14:00.', expectedEndAt: null };

  it('turns on, changes keeping who started it, and turns off', async () => {
    setMockScenario('healthy');
    const on = await apiPut<MaintenanceState>('/admin/system/maintenance', body);
    expect(on).toMatchObject({
      enabled: true,
      scope: 'all',
      message: 'Back at 14:00.',
      startedBy: { name: 'Rami K.' },
    });
    expect((await apiGet<SystemHealth>('/admin/system/health')).maintenance).toEqual(on);

    const end = new Date(Date.now() + 3_600_000).toISOString();
    const changed = await apiPut<MaintenanceState>('/admin/system/maintenance', {
      ...body,
      scope: 'checkout',
      expectedEndAt: end,
    });
    expect(changed).toMatchObject({
      scope: 'checkout',
      expectedEndAt: end,
      startedAt: on.startedAt,
      startedBy: on.startedBy,
    });

    const off = await apiPut<MaintenanceState>('/admin/system/maintenance', { enabled: false });
    expect(off).toEqual({
      enabled: false,
      scope: null,
      message: null,
      expectedEndAt: null,
      startedAt: null,
      startedBy: null,
    });
    expect((await apiGet<SystemHealth>('/admin/system/health')).maintenance.enabled).toBe(false);
  });

  it('turns the maintenance of its scenario off', async () => {
    setMockScenario('maintenance');
    await apiPut('/admin/system/maintenance', { enabled: false });
    expect((await apiGet<SystemHealth>('/admin/system/health')).maintenance.enabled).toBe(false);
  });

  it('names the fields it refuses: scope, message and a past end', async () => {
    setMockScenario('healthy');
    const error = await failure(
      apiPut('/admin/system/maintenance', {
        enabled: true,
        scope: 'everything',
        message: '  ',
        expectedEndAt: '2020-01-01T00:00:00Z',
      }),
    );
    expect(error).toMatchObject({ status: 422, code: 'VALIDATION_FAILED' });
    expect(Object.keys(error.fieldErrors).sort()).toEqual(['expectedEndAt', 'message', 'scope']);
  });
});
