// Query keys, refresh rates and page size of the System health reads. The reads are not Refine resources, so their keys
// start with `['api', 'system-health']` (decision 005). React Query matches keys as prefixes.
import type { ApiQueryKey } from '@/lib/query';

/** The start of every health read's key: Refresh and the mutations reach a whole family of reads with it. */
export const HEALTH_KEY = ['api', 'system-health'] as const;

/** The `<name>` part of each read's key. A union, so a mutation cannot name a read that does not exist. */
export type HealthRead =
  | 'health'
  | 'checks'
  | 'metrics'
  | 'errors'
  | 'orders-health'
  | 'suppliers'
  | 'queues'
  | 'failed-jobs'
  | 'jobs'
  | 'webhooks'
  | 'database'
  | 'cache'
  | 'integrity'
  | 'alerts'
  | 'alert'
  | 'alert-rules'
  | 'incidents'
  | 'incident';

/** `['api', 'system-health', <name>, ...params]`: the key of one read. */
export function healthKey(name: HealthRead, ...params: unknown[]): ApiQueryKey {
  return [...HEALTH_KEY, name, ...params];
}

/**
 * True when parameter `position` of a read's key (0 is the first one after the name) equals `value`. A hook uses it to
 * tell "the same record or queue, another page or range" from "another record or queue".
 */
export function sameParam(key: readonly unknown[], position: number, value: unknown): boolean {
  return key[HEALTH_KEY.length + 1 + position] === value;
}

/**
 * How often each kind of read asks again, in ms. `fast` is for the verdict, the queues and the alerts, `normal` for
 * the other cards, `running` for the integrity check while a run is in progress. React Query pauses the polling while
 * the browser tab is hidden.
 */
export const POLL = { fast: 15_000, normal: 30_000, running: 5_000 } as const;

/** A row range of a list: `start` is included, `end` is not (the API's `_start` and `_end`). */
export type HealthPage = { start: number; end: number };

/** Rows per page of the alerts, rules, incidents and failed jobs lists. */
export const PAGE_SIZE = 25;

/** The first page, used when a list hook is given no page. */
export const FIRST_PAGE: HealthPage = { start: 0, end: PAGE_SIZE };

/** The reads that show alerts: the list and one alert. Changing an alert makes both stale. */
export const ALERT_READS: readonly ApiQueryKey[] = [healthKey('alerts'), healthKey('alert')];

/** The reads that show incidents: the list and one incident. Changing an incident makes both stale. */
export const INCIDENT_READS: readonly ApiQueryKey[] = [healthKey('incidents'), healthKey('incident')];
