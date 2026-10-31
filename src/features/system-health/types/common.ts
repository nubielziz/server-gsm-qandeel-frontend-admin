// Shapes shared by every system-health route (route group `health`): states, units, measured values and time series.
// Assumed contract (the map gives the fields in words only): see docs/ASSUMED_CONTRACTS.md, system-health.
import type { Id, IsoDateTime } from '@/lib/api';

/** Window of the charts and ranked lists inside the tabs (`?range=`). The KPI row and "now" values ignore it. */
export type TimeRange = '1h' | '6h' | '24h' | '7d';

/** The server's verdict on one number against its thresholds. `unknown` means no data and is never shown as healthy. */
export type MetricState = 'ok' | 'warn' | 'crit' | 'unknown';

/** Status of one checked component (`service_checks.status`); `unknown` when no recent check exists. */
export type CheckStatus = 'ok' | 'degraded' | 'down' | 'unknown';

/** Overall status of the platform. `unknown` when the monitoring data is missing: never shown as Operational. */
export type OverallStatus = 'operational' | 'degraded' | 'outage' | 'unknown';

/** Unit of a measured value. `s` is shown as a duration (3m 12s); `percent` values are 0-100. */
export type MeasureUnit = 'ms' | 's' | 'percent' | 'per_min' | 'count' | 'bytes';

/** Which side of the thresholds is bad: `above` for latency and error rates, `below` for uptime and hit rate. */
export type ThresholdDirection = 'above' | 'below';

/**
 * One measured number with the server's verdict. `value` null means no data. `warn` and `crit` are the thresholds the
 * server applied: the console prints them and draws them on charts, but never compares values with them itself.
 */
export interface Measure {
  value: number | null;
  unit: MeasureUnit;
  state: MetricState;
  warn?: number | null;
  crit?: number | null;
  direction?: ThresholdDirection;
}

/** One point of a time series, oldest first. A null value is a gap (no data), drawn as a gap. */
export interface SeriesPoint {
  at: IsoDateTime;
  value: number | null;
}

/** A staff member named on a record: who acknowledged, declared, closed or ran something. */
export interface StaffRef {
  id: Id;
  name: string;
}
