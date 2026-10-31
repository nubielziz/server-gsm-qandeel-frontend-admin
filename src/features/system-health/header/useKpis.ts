// The data behind the KPI row: four reads (health, API metrics for the last 24 hours, queues, order pipeline) and the six
// tiles made from them. The row and the screen-reader announcements both call it; React Query makes them one request.
import type { HealthQuery } from '../components/HealthCard';
import { POLL, useApiMetrics, useOrdersHealth, useQueues, useSystemHealth } from '../hooks';
import {
  apiP95Figure,
  oldestJobFigure,
  openAlertsFigure,
  pastSlaFigure,
  rate5xxFigure,
  uptimeFigure,
  type KpiFigure,
  type KpiId,
} from './kpi';

/** One tile: its label, the state of the read behind it and, once the answer is there, what it shows. */
export interface KpiModel {
  id: KpiId;
  label: string;
  /** Poll interval of the read, in ms, for the "Stale" rule. */
  interval: number;
  query: HealthQuery<unknown>;
  /** Null while there is no usable answer (loading, failed, or an answer that cannot be read). */
  figure: KpiFigure | null;
}

// The shapes are an assumed contract. An answer a tile cannot read shows as "No data" in that tile only, never as a
// crash of the page and never as a healthy figure. A figure without its measure or its trend list cannot be drawn.
function figureOf<T>(data: T | undefined, pick: (data: T) => KpiFigure): KpiFigure | null {
  if (data === undefined) return null;
  try {
    const figure = pick(data);
    return figure.measure && Array.isArray(figure.trend) ? figure : null;
  } catch {
    return null;
  }
}

function tile<T>(
  id: KpiId,
  label: string,
  interval: number,
  query: HealthQuery<T>,
  pick: (data: T) => KpiFigure,
): KpiModel {
  return { id, label, interval, query, figure: figureOf(query.data, pick) };
}

/**
 * The six tiles in the order of the row. The metrics are always the last 24 hours: the range switch of the page scopes
 * the tabs, never the key figures. `enabled` is false for a staff member without `system:read`.
 */
export function useKpis(enabled = true): KpiModel[] {
  const health = useSystemHealth(enabled);
  const metrics = useApiMetrics({ range: '24h' }, enabled);
  const queues = useQueues(enabled);
  const orders = useOrdersHealth(enabled);
  return [
    tile('uptime', 'Uptime 30 days', POLL.fast, health, uptimeFigure),
    tile('p95', 'API p95', POLL.normal, metrics, apiP95Figure),
    tile('rate5xx', '5xx rate', POLL.normal, metrics, rate5xxFigure),
    tile('oldest', 'Oldest queued job', POLL.fast, queues, oldestJobFigure),
    tile('pastSla', 'Orders past SLA', POLL.normal, orders, pastSlaFigure),
    tile('alerts', 'Open alerts', POLL.fast, health, openAlertsFigure),
  ];
}
