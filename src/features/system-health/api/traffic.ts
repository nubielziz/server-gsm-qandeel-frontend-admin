// API traffic and top errors for the API tab: `GET /admin/system/metrics` and `GET /admin/system/errors`. Both read the
// monitoring system and answer 503 MONITORING_UNAVAILABLE when it is down. Assumed contracts (the map gives no bodies).
import { apiGet, type ApiInit } from '@/lib/api';
import type { ApiMetrics, ErrorsQuery, ErrorsResponse, MetricsQuery } from '../types';

/**
 * Requests per minute, latency percentiles, 4xx and 5xx rates and the 429 count for every API surface, with a time
 * series per surface and the ten slowest endpoints. Feeds the surfaces table, the latency and 5xx charts, and the KPI
 * cells "API p95" and "5xx rate".
 * Assumed contract: query `range` (`1h`, `6h`, `24h` or `7d`) and an optional `surface` to narrow the series;
 * answer `ApiMetrics`. A 503 with code `MONITORING_UNAVAILABLE` means the monitoring backend is down.
 * @route GET /admin/system/metrics
 */
export function getApiMetrics(query: MetricsQuery, init?: ApiInit): Promise<ApiMetrics> {
  return apiGet<ApiMetrics>('/admin/system/metrics', { range: query.range, surface: query.surface }, init);
}

/**
 * The most frequent errors over a range, grouped by problem code and endpoint, with first and last seen, the latest
 * request id and (when the server knows it) a Sentry link. Lets support go from "errors are up" to one request id.
 * Assumed contract: query `range` and an optional `surface`; answer `ErrorsResponse`, most frequent group first.
 * A 503 with code `MONITORING_UNAVAILABLE` means the monitoring backend is down.
 * @route GET /admin/system/errors
 */
export function getApiErrors(query: ErrorsQuery, init?: ApiInit): Promise<ErrorsResponse> {
  return apiGet<ErrorsResponse>('/admin/system/errors', { range: query.range, surface: query.surface }, init);
}
