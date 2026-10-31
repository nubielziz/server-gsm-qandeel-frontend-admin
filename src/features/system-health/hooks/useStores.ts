// Reads of the Data stores tab: Postgres and Redis.
import { getCacheHealth, getDatabaseHealth } from '../api';
import { healthKey, POLL } from './keys';
import { useHealthQuery } from './useHealthQuery';

/** Postgres: connections, pool wait, locks, replica lag, size, pending migrations, slow queries, long transactions. */
export function useDatabaseHealth(enabled = true) {
  return useHealthQuery({ key: healthKey('database'), read: getDatabaseHealth, poll: POLL.normal, enabled });
}

/** Redis: memory, evictions, hit rate, clients and latency. */
export function useCacheHealth(enabled = true) {
  return useHealthQuery({ key: healthKey('cache'), read: getCacheHealth, poll: POLL.normal, enabled });
}
