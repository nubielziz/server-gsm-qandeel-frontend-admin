// Tests for the KPI figures: each tile reads the measure and trend the design names, and prints no limit of its own.
import { describe, expect, it } from 'vitest';
import type { ApiMetrics, Measure, OrdersHealth, QueuesResponse, SeriesPoint, SystemHealth } from '../types';
import {
  apiP95Figure,
  hasTrend,
  oldestJobFigure,
  openAlertsFigure,
  pastSlaFigure,
  rate5xxFigure,
  uptimeFigure,
} from './kpi';

const point = (value: number | null, hour = 0): SeriesPoint => ({
  at: `2026-10-31T${String(hour).padStart(2, '0')}:00:00.000Z`,
  value,
});
const measure = (value: number | null, unit: Measure['unit'], state: Measure['state'] = 'ok'): Measure => ({
  value,
  unit,
  state,
});

const health = {
  uptime: {
    h24: measure(100, 'percent'),
    d7: measure(99.99, 'percent'),
    d30: measure(99.93, 'percent'),
    daily: [point(99.9), point(100, 1)],
  },
  alerts: { open: measure(2, 'count', 'crit'), critical: 1, items: [], trend: [point(1), point(2, 1)] },
} as unknown as SystemHealth;

const metrics = {
  total: {
    p95: measure(412, 'ms'),
    rate5xx: measure(0.42, 'percent', 'warn'),
    series: { p95: [point(400), point(412, 1)], rate5xx: [point(0.1), point(0.42, 1)] },
  },
} as unknown as ApiMetrics;

describe('KPI figures', () => {
  it('reads uptime over 30 days with its daily points and calls the limit a target', () => {
    const figure = uptimeFigure(health);
    expect(figure.measure).toBe(health.uptime.d30);
    expect(figure.trend).toBe(health.uptime.daily);
    expect(figure).toMatchObject({ trendLabel: '30 days', threshold: true, thresholdWord: 'target' });
  });

  it('reads p95 and the 5xx rate from the totals of the metrics, with their own series', () => {
    expect(apiP95Figure(metrics)).toMatchObject({
      measure: metrics.total.p95,
      trendLabel: '24h',
      threshold: true,
    });
    expect(apiP95Figure(metrics).trend).toEqual(metrics.total.series.p95);
    expect(rate5xxFigure(metrics).measure).toBe(metrics.total.rate5xx);
    expect(rate5xxFigure(metrics).trend).toEqual(metrics.total.series.rate5xx);
  });

  it('reads the oldest queued job from the queues and orders past SLA from the pipeline', () => {
    const queues = {
      oldestAge: measure(192, 's', 'warn'),
      trend: [point(60), point(192, 1)],
    } as unknown as QueuesResponse;
    expect(oldestJobFigure(queues).measure).toBe(queues.oldestAge);
    expect(oldestJobFigure(queues).trend).toEqual(queues.trend);

    const orders = {
      stuck: { total: measure(23, 'count', 'crit'), trend: [point(2), point(23, 1)] },
    } as unknown as OrdersHealth;
    expect(pastSlaFigure(orders).measure).toBe(orders.stuck.total);
    expect(pastSlaFigure(orders).trend).toEqual(orders.stuck.trend);
  });

  it('keeps one worst point per hour of a 24h trend, so 96 quarter-hours fit the small tile line', () => {
    const day = Array.from({ length: 96 }, (_, i) => point(i % 4 === 1 ? 9 : 1, i));
    const figure = apiP95Figure({
      total: { ...metrics.total, series: { ...metrics.total.series, p95: day } },
    } as unknown as ApiMetrics);
    expect(figure.trend).toHaveLength(24);
    expect(figure.trend.every((p) => p.value === 9)).toBe(true);
    expect(figure.zeroBased).toBe(true);
  });

  it('draws uptime on its own scale, not from zero, with all 30 days', () => {
    const figure = uptimeFigure(health);
    expect(figure.zeroBased).toBe(false);
    expect(figure.trend).toBe(health.uptime.daily);
  });

  it('names the critical alerts instead of printing a threshold for the open alerts', () => {
    const figure = openAlertsFigure(health);
    expect(figure.measure).toBe(health.alerts.open);
    expect(figure).toMatchObject({ threshold: false, note: '1 critical' });
  });

  it('has no note when no open alert is critical', () => {
    const calm = {
      alerts: { open: measure(0, 'count'), critical: 0, items: [], trend: [] },
    } as unknown as SystemHealth;
    expect(openAlertsFigure(calm).note).toBeUndefined();
  });
});

describe('hasTrend', () => {
  it('is true when any point has a value, even a zero', () => {
    expect(hasTrend([point(null), point(0, 1)])).toBe(true);
  });

  it('is false for no points or only gaps', () => {
    expect(hasTrend([])).toBe(false);
    expect(hasTrend([point(null), point(null, 1)])).toBe(false);
  });
});
