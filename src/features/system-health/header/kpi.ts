// The six key figures of the KPI row and where each comes from (docs/system-health-design.md, "KPI row"). Each function
// picks the measure and its trend out of one answer; the server already gave the state and the thresholds, so nothing
// here compares a value with a limit.
import { downsample } from '../lib';
import type { ApiMetrics, Measure, OrdersHealth, QueuesResponse, SeriesPoint, SystemHealth } from '../types';

/**
 * A tile's trend line is 72 px wide: the 96 quarter-hours of a day would draw as a solid block, so a 24h trend keeps
 * one point per hour (the worst of the hour).
 */
const DAY_POINTS = 24;

/** The 24h trend of a measure, one worst point per hour. */
function dayTrend(trend: readonly SeriesPoint[], measure: Measure): SeriesPoint[] {
  return downsample(trend, DAY_POINTS, measure.direction);
}

/** The tiles in the order of the row. */
export type KpiId = 'uptime' | 'p95' | 'rate5xx' | 'oldest' | 'pastSla' | 'alerts';

/** What one tile shows once its answer has arrived. */
export interface KpiFigure {
  measure: Measure;
  /** The trend, oldest first. A null point is a gap. */
  trend: readonly SeriesPoint[];
  /** The window of the trend, as the tile says it ("30 days", "24h"). */
  trendLabel: string;
  /**
   * Draw the trend from zero, so noise near zero stays flat. True for counts, rates and times; false for uptime, which
   * lives between 99 and 100 and would be a flat line from zero.
   */
  zeroBased: boolean;
  /** Print the server's threshold under the value ("warn 800 ms"). */
  threshold: boolean;
  /** Replaces the word "warn" in the threshold text ("target" for uptime). */
  thresholdWord?: string;
  /** A short line under the value in place of a threshold ("1 critical"). */
  note?: string;
}

/** Platform uptime over 30 days, with its 30 daily points. */
export function uptimeFigure(health: SystemHealth): KpiFigure {
  return {
    measure: health.uptime.d30,
    trend: health.uptime.daily,
    trendLabel: '30 days',
    zeroBased: false,
    threshold: true,
    thresholdWord: 'target',
  };
}

/** API response time p95 over the last 24 hours, all surfaces together. */
export function apiP95Figure(metrics: ApiMetrics): KpiFigure {
  const measure = metrics.total.p95;
  return {
    measure,
    trend: dayTrend(metrics.total.series.p95, measure),
    trendLabel: '24h',
    zeroBased: true,
    threshold: true,
  };
}

/** Share of API answers that were 5xx over the last 24 hours. */
export function rate5xxFigure(metrics: ApiMetrics): KpiFigure {
  const measure = metrics.total.rate5xx;
  return {
    measure,
    trend: dayTrend(metrics.total.series.rate5xx, measure),
    trendLabel: '24h',
    zeroBased: true,
    threshold: true,
  };
}

/** Age of the oldest waiting job of all queues. */
export function oldestJobFigure(queues: QueuesResponse): KpiFigure {
  const measure = queues.oldestAge;
  return {
    measure,
    trend: dayTrend(queues.trend, measure),
    trendLabel: '24h',
    zeroBased: true,
    threshold: true,
  };
}

/** Orders past their SLA right now. */
export function pastSlaFigure(orders: OrdersHealth): KpiFigure {
  const measure = orders.stuck.total;
  return {
    measure,
    trend: dayTrend(orders.stuck.trend, measure),
    trendLabel: '24h',
    zeroBased: true,
    threshold: true,
  };
}

/** Open alerts (firing or acknowledged); the note says how many are critical. */
export function openAlertsFigure(health: SystemHealth): KpiFigure {
  const { open, critical, trend } = health.alerts;
  return {
    measure: open,
    trend: dayTrend(trend, open),
    trendLabel: '24h',
    zeroBased: true,
    threshold: false,
    note: critical > 0 ? `${critical} critical` : undefined,
  };
}

/** True when at least one point of the trend has a value, so there is a line to draw. */
export function hasTrend(trend: readonly SeriesPoint[]): boolean {
  return trend.some((point) => point.value !== null);
}
