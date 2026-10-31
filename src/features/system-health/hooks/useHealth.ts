// Reads of the overall status: the health summary and the check history of the components. They serve the page header,
// the verdict, the KPI row, the shell banner and the Overview tab.
import { getChecks, getSystemHealth } from '../api';
import type { ChecksQuery } from '../types';
import { healthKey, POLL, sameParam } from './keys';
import { useHealthQuery } from './useHealthQuery';

/**
 * The health summary: overall status, build, components, uptime, open alerts, incidents and maintenance. It polls
 * fast. The page and the shell banner call this same hook, so they share one request. Pass `enabled: false` until the
 * staff member's permissions are known, or without `system:read`.
 */
export function useSystemHealth(enabled = true) {
  return useHealthQuery({ key: healthKey('health'), read: getSystemHealth, poll: POLL.fast, enabled });
}

/**
 * The check history (uptime bars and response time) over `query.range`, for every component or for `query.component`.
 * A new range keeps the previous answer on screen while it loads; another component does not.
 */
export function useChecks(query: ChecksQuery, enabled = true) {
  const component = query.component ?? null;
  return useHealthQuery({
    key: healthKey('checks', query.range, component),
    read: (init) => getChecks(query, init),
    poll: POLL.normal,
    enabled,
    keepPrevious: (previousKey) => sameParam(previousKey, 1, component),
  });
}
