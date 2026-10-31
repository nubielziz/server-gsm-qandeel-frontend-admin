// Tests of the System health mock's time series: the number and spacing of the points per range, that a point keeps its
// value when the window moves (seeded by name and bucket), that the newest point is the figure above it, the gaps where
// data is missing, and how the slow supplier and the database outage show in the history.
import { describe, expect, it, vi } from 'vitest';
import { apiGet, apiPatch } from '@/lib/api';
import { setMockScenario } from '@/mocks/scenario';
import type {
  ApiMetrics,
  ChecksResponse,
  OrdersHealth,
  QueuesResponse,
  SeriesPoint,
  SystemHealth,
  TimeRange,
} from '../types';
import { failure, freezeClock, setupHealthMocks } from './testing';

setupHealthMocks();
freezeClock('2026-10-31T12:07:30Z');

const metrics = (range: TimeRange, surface?: string) =>
  apiGet<ApiMetrics>('/admin/system/metrics', { range, surface });
const checks = (range: TimeRange, component?: string) =>
  apiGet<ChecksResponse>('/admin/system/checks', { range, component });
const values = (points: SeriesPoint[]): (number | null)[] => points.map((point) => point.value);

describe('metrics series', () => {
  const sizes: [TimeRange, number, number][] = [
    ['1h', 60, 60],
    ['6h', 72, 300],
    ['24h', 96, 900],
    ['7d', 168, 3600],
  ];
  for (const [range, count, seconds] of sizes) {
    it(`${range}: ${count} points, ${seconds} seconds apart, newest bucket last`, async () => {
      const result = await metrics(range);
      expect(result.range).toBe(range);
      expect(result.bucketSeconds).toBe(seconds);
      expect(result.surfaces.map((surface) => surface.surface)).toEqual([
        'v1',
        'dhru',
        'client',
        'store',
        'admin',
        'hooks',
      ]);
      for (const surface of [result.total, ...result.surfaces]) {
        for (const series of Object.values(surface.series) as SeriesPoint[][]) {
          expect(series).toHaveLength(count);
          const times = series.map((point) => Date.parse(point.at));
          times.slice(1).forEach((time, i) => expect(time - times[i]).toBe(seconds * 1000));
        }
      }
      const newest = Date.parse(result.total.series.p95.at(-1)?.at ?? '');
      expect(newest).toBe(Math.floor(Date.now() / (seconds * 1000)) * seconds * 1000);
    });
  }

  it('keeps every finished point when the window moves by one bucket', async () => {
    const before = await metrics('24h');
    vi.setSystemTime(new Date('2026-10-31T12:22:30Z'));
    const after = await metrics('24h');
    for (const [name, series] of Object.entries(before.total.series)) {
      const moved = values(after.total.series[name as keyof typeof after.total.series]);
      // Point i of the later answer is point i+1 of the earlier one; the earlier newest bucket was still filling.
      expect(moved.slice(0, 94)).toEqual(values(series).slice(1, 95));
    }
  });

  it('makes the newest point the figure above it', async () => {
    const { total } = await metrics('24h');
    for (const key of ['p50', 'p95', 'p99'] as const) {
      const latest = total.series[key].at(-1)?.value ?? 0;
      expect(Math.abs(latest - (total[key].value ?? 0)) / (total[key].value ?? 1)).toBeLessThan(0.12);
    }
  });

  it('reads the "now" figure the same whatever the range, in the same minute', async () => {
    const [hour, week] = [await metrics('1h'), await metrics('7d')];
    expect(hour.total.p95.value).toBe(week.total.p95.value);
    expect(hour.surfaces[0].rate5xx.value).toBe(week.surfaces[0].rate5xx.value);
  });

  it('leaves a gap where Prometheus missed scrapes: the webhook surface, not the total', async () => {
    const result = await metrics('24h');
    const hooks = result.surfaces.find((surface) => surface.surface === 'hooks');
    const gaps = hooks?.series.p95.filter((point) => point.value === null) ?? [];
    expect(gaps.length).toBeGreaterThanOrEqual(2);
    expect(gaps.length).toBeLessThanOrEqual(4);
    expect(hooks?.series.requestsPerMin.filter((point) => point.value === null)).toHaveLength(gaps.length);
    expect(result.total.series.p95.every((point) => point.value !== null)).toBe(true);
    expect(
      result.surfaces.find((surface) => surface.surface === 'v1')?.series.p95.every((p) => p.value !== null),
    ).toBe(true);
  });

  it('misses one bucket for every surface while the API restarts after a deploy', async () => {
    setMockScenario('partial-failure');
    const result = await metrics('1h');
    for (const surface of [result.total, ...result.surfaces]) {
      const missing = surface.series.p95.filter((point) => point.value === null);
      expect(missing).toHaveLength(1);
      // 46 minutes before the first read, on the minute.
      expect(missing[0].at).toBe('2026-10-31T11:21:00.000Z');
    }
  });

  it('follows the daily traffic curve: busier at 14:00 than at 02:00', async () => {
    const { total } = await metrics('24h');
    // The window runs from yesterday 12:00 to today 12:00, so the afternoon is yesterday's.
    const at = (hour: number) =>
      total.series.requestsPerMin.find(
        (point) => point.at.slice(11, 16) === `${String(hour).padStart(2, '0')}:00`,
      )?.value ?? 0;
    const day = [13, 14, 15].map(at);
    const night = [2, 3].map(at);
    expect(Math.min(...day)).toBeGreaterThan(Math.max(...night) * 1.5);
  });

  it('narrows to one surface: its own totals, its own slowest endpoints', async () => {
    const result = await metrics('24h', 'v1');
    expect(result.surfaces.map((surface) => surface.surface)).toEqual(['v1']);
    expect(result.total).toMatchObject({ surface: 'v1', label: 'Merchant API v1' });
    expect(result.total.p95.value).toBe(result.surfaces[0].p95.value);
    expect(result.slowest.length).toBeGreaterThan(0);
    expect(result.slowest.every((endpoint) => endpoint.surface === 'v1')).toBe(true);
    expect((await failure(metrics('24h', 'mobile'))).fieldErrors).toEqual({ surface: ['Unknown surface.'] });
    expect((await failure(apiGet('/admin/system/metrics', { range: '30d' }))).fieldErrors).toHaveProperty(
      'range',
    );
  });

  it('lists the ten slowest endpoints, slowest first', async () => {
    const calm = await metrics('24h');
    expect(calm.slowest).toHaveLength(10);
    const p95 = calm.slowest.map((endpoint) => endpoint.p95.value ?? 0);
    expect(p95).toEqual([...p95].sort((a, b) => b - a));
    expect(calm.slowest[0]).toMatchObject({
      method: 'GET',
      path: '/admin/reports/finance',
      surface: 'admin',
    });
    setMockScenario('degraded');
    const slow = await metrics('24h');
    expect(slow.slowest[0]).toMatchObject({ method: 'POST', path: '/v1/orders' });
    expect(slow.slowest[0].p95.state).toBe('crit');
  });
});

describe('surface states in a trouble', () => {
  const p95States = async (): Promise<Record<string, string>> => {
    const { surfaces } = await metrics('24h');
    return Object.fromEntries(surfaces.map((surface) => [surface.surface, surface.p95.state]));
  };

  it('degraded: the merchant API is critical, the Dhru API warns, the rest is fine', async () => {
    setMockScenario('degraded');
    expect(await p95States()).toEqual({
      v1: 'crit',
      dhru: 'warn',
      client: 'ok',
      store: 'ok',
      admin: 'ok',
      hooks: 'ok',
    });
    const { total, surfaces } = await metrics('24h');
    expect(surfaces.map((surface) => surface.rate5xx.state)).toEqual([
      'warn',
      'warn',
      'ok',
      'ok',
      'ok',
      'ok',
    ]);
    expect(total.p95.state).toBe('warn');
  });

  it('outage: every surface is critical and the traffic falls', async () => {
    setMockScenario('outage');
    expect(Object.values(await p95States())).toEqual(Array(6).fill('crit'));
    const calm = (await metrics('24h')).total.requestsPerMin.value ?? 0;
    setMockScenario('healthy');
    expect(calm).toBeLessThan(((await metrics('24h')).total.requestsPerMin.value ?? 0) * 0.7);
  });
});

describe('check history', () => {
  const sizes: [TimeRange, number, number][] = [
    ['1h', 60, 60],
    ['6h', 72, 300],
    ['24h', 48, 1800],
    ['7d', 56, 10_800],
  ];
  for (const [range, count, seconds] of sizes) {
    it(`${range}: ${count} cells of ${seconds} seconds for each of the 14 components`, async () => {
      const result = await checks(range);
      expect(result.bucketSeconds).toBe(seconds);
      expect(result.components).toHaveLength(14);
      for (const component of result.components) expect(component.buckets).toHaveLength(count);
    });
  }

  it('has a calm day with no outage cell and no gap', async () => {
    const result = await checks('24h');
    for (const component of result.components) {
      expect(
        component.buckets.some((bucket) => bucket.status === 'down' || bucket.status === 'unknown'),
      ).toBe(false);
      expect(component.uptime.state).toBe('ok');
      expect(
        component.buckets.every((bucket) => bucket.checks === 30 || bucket === component.buckets.at(-1)),
      ).toBe(true);
    }
  });

  it('shows the slow supplier down for the last 38 minutes, with its response time climbing to six seconds', async () => {
    setMockScenario('degraded');
    const [supplier] = (await checks('1h', 'supplier:3')).components;
    const down = supplier.buckets.filter((bucket) => bucket.status === 'down');
    expect(down.length).toBeGreaterThanOrEqual(37);
    expect(down.length).toBeLessThanOrEqual(40);
    expect(supplier.buckets[0]).toMatchObject({ status: 'ok', failures: 0 });
    expect(supplier.buckets[0].latencyMs).toBeLessThan(1200);
    expect(supplier.buckets.at(-1)).toMatchObject({ status: 'down', failures: 1 });
    expect(supplier.buckets.at(-1)?.latencyMs).toBeGreaterThan(5000);
    expect(supplier.uptime.state).toBe('crit');
    expect(supplier.latency).toMatchObject({ state: 'crit', unit: 'ms' });
    // The same hour for a healthy supplier.
    const [fine] = (await checks('1h', 'supplier:1')).components;
    expect(fine.buckets.every((bucket) => bucket.status !== 'down')).toBe(true);
  });

  it('gives a down database no response time at all', async () => {
    setMockScenario('outage');
    const [postgres] = (await checks('1h', 'postgres')).components;
    expect(postgres.buckets.at(-1)).toMatchObject({
      status: 'down',
      checks: 1,
      failures: 1,
      latencyMs: null,
    });
    expect(postgres.buckets[0]).toMatchObject({ status: 'ok' });
    expect(postgres.latency).toMatchObject({ value: null, state: 'unknown' });
    const [workers] = (await checks('1h', 'workers')).components;
    expect(workers.buckets.at(-1)?.status).toBe('degraded');
    expect(workers.buckets.at(-1)?.latencyMs).toBeGreaterThan(1000);
  });

  it('has no checks for two minutes after a deploy: the cells are unknown, never ok', async () => {
    setMockScenario('partial-failure');
    const result = await checks('1h');
    for (const component of result.components) {
      const unknown = component.buckets.filter((bucket) => bucket.status === 'unknown');
      expect(unknown.map((bucket) => bucket.start)).toEqual([
        '2026-10-31T11:21:00.000Z',
        '2026-10-31T11:22:00.000Z',
      ]);
      expect(unknown.every((bucket) => bucket.checks === 0 && bucket.latencyMs === null)).toBe(true);
    }
  });

  it('knows no checks for a disabled supplier', async () => {
    await apiPatch('/admin/suppliers/5', { status: 'disabled' });
    const [supplier] = (await checks('6h', 'supplier:5')).components;
    expect(supplier.buckets.every((bucket) => bucket.status === 'unknown' && bucket.checks === 0)).toBe(true);
    expect(supplier.uptime).toMatchObject({ value: null, state: 'unknown' });
  });

  it('answers 404 for a component nobody checks and 422 for a range that is not one', async () => {
    expect((await failure(checks('24h', 'supplier:99'))).status).toBe(404);
    expect((await failure(apiGet('/admin/system/checks', { range: 'week' }))).status).toBe(422);
  });
});

describe('trends', () => {
  it('draws 24 hours of 15 minutes for the KPI cells and 30 days for uptime', async () => {
    const health = await apiGet<SystemHealth>('/admin/system/health');
    const orders = await apiGet<OrdersHealth>('/admin/system/orders-health');
    const queues = await apiGet<QueuesResponse>('/admin/system/queues');
    expect(health.uptime.daily).toHaveLength(30);
    expect(health.alerts.trend).toHaveLength(96);
    expect(orders.stuck.trend).toHaveLength(96);
    expect(queues.trend).toHaveLength(96);
    const days = health.uptime.daily.map((point) => Date.parse(point.at));
    days.slice(1).forEach((day, i) => expect(day - days[i]).toBe(86_400_000));
    expect(health.uptime.daily.every((point) => (point.value ?? 0) > 99)).toBe(true);
  });

  it('climbs with the trouble and ends where the figure is', async () => {
    setMockScenario('degraded');
    const health = await apiGet<SystemHealth>('/admin/system/health');
    const orders = await apiGet<OrdersHealth>('/admin/system/orders-health');
    const queues = await apiGet<QueuesResponse>('/admin/system/queues');
    // Open alerts: none a day ago, both open now.
    expect(health.alerts.trend[0].value).toBe(0);
    expect(health.alerts.trend.at(-1)?.value).toBe(2);
    // Orders past SLA: a few now and then, then up to today's 23.
    expect(orders.stuck.trend[0].value).toBeLessThanOrEqual(3);
    expect(Math.abs((orders.stuck.trend.at(-1)?.value ?? 0) - 23)).toBeLessThanOrEqual(5);
    // Oldest queued job: seconds, then minutes.
    expect(queues.trend[0].value).toBeLessThan(30);
    expect(Math.abs((queues.trend.at(-1)?.value ?? 0) - (queues.oldestAge.value ?? 0))).toBeLessThan(40);
  });

  it('is one flat line of zeros in the calm, not green by default but really calm', async () => {
    const { alerts } = await apiGet<SystemHealth>('/admin/system/health');
    expect(alerts.trend.every((point) => point.value === 0)).toBe(true);
  });

  it('keeps the uptime of an outage month below the calm one', async () => {
    const calm = await apiGet<SystemHealth>('/admin/system/health');
    setMockScenario('outage');
    const outage = await apiGet<SystemHealth>('/admin/system/health');
    const lowest = (health: SystemHealth) =>
      Math.min(...health.uptime.daily.map((point) => point.value ?? 100));
    expect(lowest(calm)).toBeGreaterThan(99.5);
    expect(lowest(outage)).toBeLessThan(90);
    expect(outage.uptime.d30.value).toBeLessThan(calm.uptime.d30.value ?? 0);
  });
});
