// Tests of the numbers the System health mock plays: the six KPI states per scenario against the design brief's
// thresholds, that every Measure agrees with its own limits, the error groups, the cache, the jobs and the webhooks.
import { describe, expect, it } from 'vitest';
import { apiGet } from '@/lib/api';
import { MOCK_SCENARIOS, setMockScenario, type MockScenario } from '@/mocks/scenario';
import type {
  ApiMetrics,
  CacheHealth,
  ErrorsResponse,
  JobsResponse,
  Measure,
  MetricState,
  OrdersHealth,
  QueuesResponse,
  SystemHealth,
  WebhooksHealth,
} from '../types';
import { failure, setupHealthMocks } from './testing';

setupHealthMocks();

const health = () => apiGet<SystemHealth>('/admin/system/health');

// The six cells of the KPI row, as the console reads them (design brief, "KPI row").
type Kpi = 'uptime' | 'p95' | 'rate5xx' | 'queueAge' | 'pastSla' | 'alerts';
const KPI_ORDER: Kpi[] = ['uptime', 'p95', 'rate5xx', 'queueAge', 'pastSla', 'alerts'];

async function kpiStates(): Promise<Record<Kpi, MetricState | 'error'>> {
  const read = async (call: () => Promise<Measure>): Promise<MetricState | 'error'> => {
    try {
      return (await call()).state;
    } catch {
      return 'error';
    }
  };
  const now = await health();
  return {
    uptime: now.uptime.d30.state,
    p95: await read(
      async () => (await apiGet<ApiMetrics>('/admin/system/metrics', { range: '24h' })).total.p95,
    ),
    rate5xx: await read(
      async () => (await apiGet<ApiMetrics>('/admin/system/metrics', { range: '24h' })).total.rate5xx,
    ),
    queueAge: await read(async () => (await apiGet<QueuesResponse>('/admin/system/queues')).oldestAge),
    pastSla: await read(async () => (await apiGet<OrdersHealth>('/admin/system/orders-health')).stuck.total),
    alerts: now.alerts.open.state,
  };
}

describe('KPI row states', () => {
  const expected: Record<MockScenario, (MetricState | 'error')[]> = {
    healthy: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok'],
    degraded: ['ok', 'warn', 'warn', 'warn', 'crit', 'crit'],
    outage: ['crit', 'crit', 'crit', 'crit', 'error', 'crit'],
    'monitoring-down': ['ok', 'error', 'error', 'ok', 'ok', 'unknown'],
    'partial-failure': ['ok', 'ok', 'ok', 'error', 'ok', 'ok'],
    maintenance: ['ok', 'ok', 'ok', 'ok', 'ok', 'crit'],
    readonly: ['ok', 'warn', 'warn', 'warn', 'crit', 'crit'],
  };
  for (const scenario of MOCK_SCENARIOS) {
    it(`${scenario}: ${expected[scenario].join(', ')}`, async () => {
      setMockScenario(scenario);
      const states = await kpiStates();
      expect(KPI_ORDER.map((kpi) => states[kpi])).toEqual(expected[scenario]);
    });
  }
});

// A Measure carries the limits the server applied; its state must follow from them.
function expectedState(measure: Measure): MetricState {
  if (measure.value === null) return 'unknown';
  const { warn, crit, direction = 'above' } = measure;
  const beyond = (limit: number | null | undefined): boolean =>
    limit !== undefined &&
    limit !== null &&
    (direction === 'above' ? measure.value! > limit : measure.value! < limit);
  return beyond(crit) ? 'crit' : beyond(warn) ? 'warn' : 'ok';
}

function collectMismatches(node: unknown, path: string, found: string[]): void {
  if (Array.isArray(node)) {
    node.forEach((item, i) => collectMismatches(item, `${path}[${i}]`, found));
  } else if (typeof node === 'object' && node !== null) {
    const record = node as Record<string, unknown>;
    if ('value' in record && 'unit' in record && 'state' in record) {
      // The open-alert count is judged by how many are critical, not by a limit.
      if (!path.endsWith('alerts.open') && record.state !== expectedState(record as unknown as Measure)) {
        found.push(`${path}: ${JSON.stringify(record)}`);
      }
      return;
    }
    for (const [key, value] of Object.entries(record)) collectMismatches(value, `${path}.${key}`, found);
  }
}

describe('every Measure agrees with its own limits', () => {
  const reads: [string, Record<string, string> | undefined][] = [
    ['/admin/system/health', undefined],
    ['/admin/system/checks', { range: '24h' }],
    ['/admin/system/metrics', { range: '24h' }],
    ['/admin/system/orders-health', undefined],
    ['/admin/system/suppliers', undefined],
    ['/admin/system/queues', undefined],
    ['/admin/system/jobs', undefined],
    ['/admin/system/webhooks', undefined],
    ['/admin/system/database', undefined],
    ['/admin/system/cache', undefined],
  ];
  for (const scenario of MOCK_SCENARIOS) {
    it(scenario, async () => {
      setMockScenario(scenario);
      const found: string[] = [];
      for (const [path, query] of reads) {
        try {
          collectMismatches(await apiGet(path, query), path, found);
        } catch {
          // a scenario may fail this read on purpose
        }
      }
      expect(found).toEqual([]);
    });
  }
});

describe('errors and the cache', () => {
  it('lists the most frequent error groups, 4xx and 5xx, with a Sentry link on server errors only', async () => {
    setMockScenario('healthy');
    const errors = await apiGet<ErrorsResponse>('/admin/system/errors', { range: '24h' });
    expect(errors.groups.length).toBeGreaterThanOrEqual(8);
    expect(errors.groups.length).toBeLessThanOrEqual(10);
    const counts = errors.groups.map((group) => group.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    expect(errors.total).toBeGreaterThanOrEqual(counts.reduce((sum, count) => sum + count, 0));
    for (const group of errors.groups) {
      expect(group.lastRequestId).toMatch(/^req_[0-9a-f]{12}$/);
      expect(Date.parse(group.firstSeenAt)).toBeLessThanOrEqual(Date.parse(group.lastSeenAt));
      expect(group.sentryUrl !== null).toBe(group.status >= 500);
    }
    const one = await apiGet<ErrorsResponse>('/admin/system/errors', { range: '24h', surface: 'client' });
    expect(one.groups.every((group) => group.surface === 'client')).toBe(true);
    const cache = await apiGet<CacheHealth>('/admin/system/cache');
    expect(cache.memory.usage.state).toBe('ok');
  });

  it('keeps the unlisted trouble groups out of the calm scenarios and adds them to degraded and outage', async () => {
    const codes = async (scenario: MockScenario): Promise<string[]> => {
      setMockScenario(scenario);
      return (await apiGet<ErrorsResponse>('/admin/system/errors', { range: '1h' })).groups.map(
        (g) => g.code,
      );
    };
    expect(await codes('healthy')).not.toContain('SUPPLIER_UNAVAILABLE');
    expect(await codes('degraded')).toContain('SUPPLIER_UNAVAILABLE');
    expect(await codes('outage')).toContain('DATABASE_UNAVAILABLE');
    expect(await codes('maintenance')).toContain('MAINTENANCE');
  });
});

describe('jobs and webhooks', () => {
  it('lists seven schedules; the history of a job comes with ?job=', async () => {
    setMockScenario('healthy');
    const all = await apiGet<JobsResponse>('/admin/system/jobs');
    expect(all.jobs).toHaveLength(7);
    expect(all.runs).toEqual([]);
    for (const job of all.jobs) {
      expect(job.lastRun?.status).toBe('succeeded');
      expect(Date.parse(job.nextRunAt ?? '')).toBeGreaterThan(Date.now());
    }
    const one = await apiGet<JobsResponse>('/admin/system/jobs', { job: 'price_sync' });
    expect(one.runs.length).toBeGreaterThanOrEqual(10);
    expect(one.runs.every((run) => run.job === 'price_sync')).toBe(true);
    const times = one.runs.map((run) => Date.parse(run.startedAt ?? ''));
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect((await failure(apiGet('/admin/system/jobs', { job: 'nope' }))).status).toBe(404);
  });

  it('shows a failed price sync in degraded and failing gateways in outage', async () => {
    setMockScenario('degraded');
    const jobs = await apiGet<JobsResponse>('/admin/system/jobs');
    expect(jobs.jobs.find((job) => job.name === 'price_sync')).toMatchObject({
      state: 'crit',
      lastRun: { status: 'failed', error: 'Rapid IMEI: timeout after 6000 ms' },
    });
    setMockScenario('outage');
    const webhooks = await apiGet<WebhooksHealth>('/admin/system/webhooks');
    expect(webhooks.incoming.successRate.state).toBe('crit');
  });
});
