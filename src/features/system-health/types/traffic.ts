// API traffic and errors: `GET /admin/system/metrics` and `GET /admin/system/errors`. Both read the monitoring system
// (Prometheus, Sentry) and answer 503 MONITORING_UNAVAILABLE when it is down. Assumed contract.
import type { IsoDateTime } from '@/lib/api';
import type { Measure, SeriesPoint, TimeRange } from './common';

/** Query of `GET /admin/system/metrics`. Without `surface`, every surface comes back. */
export interface MetricsQuery {
  range: TimeRange;
  surface?: string;
}

/** The time series of one surface over the range, one point per bucket. */
export interface SurfaceSeries {
  requestsPerMin: SeriesPoint[];
  p50: SeriesPoint[];
  p95: SeriesPoint[];
  p99: SeriesPoint[];
  rate4xx: SeriesPoint[];
  rate5xx: SeriesPoint[];
}

/**
 * Traffic of one API surface (`v1`, `dhru`, `client`, `store`, `admin`, `hooks`…). The measures are "now" (the last
 * few minutes); `series` covers the range.
 */
export interface SurfaceMetrics {
  surface: string;
  label: string;
  requestsPerMin: Measure;
  p50: Measure;
  p95: Measure;
  p99: Measure;
  rate4xx: Measure;
  rate5xx: Measure;
  count429: Measure;
  series: SurfaceSeries;
}

/** One of the ten slowest endpoints over the range. */
export interface SlowEndpoint {
  method: string;
  path: string;
  surface: string;
  p95: Measure;
  requestsPerMin: number;
}

/** Answer of `GET /admin/system/metrics`: all surfaces together (`total`), each surface, and the slowest endpoints. */
export interface ApiMetrics {
  range: TimeRange;
  bucketSeconds: number;
  total: SurfaceMetrics;
  surfaces: SurfaceMetrics[];
  slowest: SlowEndpoint[];
}

/** Query of `GET /admin/system/errors`. */
export interface ErrorsQuery {
  range: TimeRange;
  surface?: string;
}

/** One group of errors with the same problem code on the same endpoint. */
export interface ErrorGroup {
  /** The problem+json `code` ("SUPPLIER_TIMEOUT"). */
  code: string;
  status: number;
  method: string;
  endpoint: string;
  surface: string;
  count: number;
  firstSeenAt: IsoDateTime;
  lastSeenAt: IsoDateTime;
  /** `X-Request-Id` of the latest occurrence, for support and log searches. */
  lastRequestId: string | null;
  /** The Sentry issue, when the server knows it. Shown only when `VITE_SENTRY_URL` is set. */
  sentryUrl: string | null;
}

/** Answer of `GET /admin/system/errors`: the most frequent groups first. */
export interface ErrorsResponse {
  range: TimeRange;
  /** All errors in the range, including the groups not listed. */
  total: number;
  groups: ErrorGroup[];
}
