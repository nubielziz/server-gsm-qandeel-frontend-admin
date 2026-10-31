// Reads of the API tab: traffic per surface and the most frequent errors. Both come from the monitoring system and fail
// with 503 MONITORING_UNAVAILABLE when it is down (see `isMonitoringUnavailable`), which the cards show as neutral.
import { getApiErrors, getApiMetrics } from '../api';
import type { ErrorsQuery, MetricsQuery } from '../types';
import { healthKey, POLL, sameParam } from './keys';
import { useHealthQuery } from './useHealthQuery';

/**
 * Requests, latency and error rates per surface over `query.range`; also feeds the KPI cells "API p95" and "5xx rate".
 * A new range keeps the previous answer on screen while it loads; another surface does not.
 */
export function useApiMetrics(query: MetricsQuery, enabled = true) {
  const surface = query.surface ?? null;
  return useHealthQuery({
    key: healthKey('metrics', query.range, surface),
    read: (init) => getApiMetrics(query, init),
    poll: POLL.normal,
    enabled,
    keepPrevious: (previousKey) => sameParam(previousKey, 1, surface),
  });
}

/**
 * The most frequent errors over `query.range`, grouped by problem code and endpoint. A new range keeps the previous
 * answer on screen while it loads; another surface does not.
 */
export function useApiErrors(query: ErrorsQuery, enabled = true) {
  const surface = query.surface ?? null;
  return useHealthQuery({
    key: healthKey('errors', query.range, surface),
    read: (init) => getApiErrors(query, init),
    poll: POLL.normal,
    enabled,
    keepPrevious: (previousKey) => sameParam(previousKey, 1, surface),
  });
}
