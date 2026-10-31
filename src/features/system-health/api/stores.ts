// Data stores for the Data stores tab: `GET /admin/system/database` (Postgres) and `GET /admin/system/cache` (Redis).
// Read only. The map gives no bodies, so the shapes are assumed contracts.
import { apiGet, type ApiInit } from '@/lib/api';
import type { CacheHealth, DatabaseHealth } from '../types';

/**
 * Postgres at a glance: connections out of the maximum, pool wait, locks, replica lag, size and growth, pending
 * migrations, the slowest queries and the long transactions. Shows where the database is under pressure before it
 * becomes an outage.
 * Assumed contract: answer `DatabaseHealth`; no query. `replicaLag` is null when there is no replica.
 * @route GET /admin/system/database
 */
export function getDatabaseHealth(init?: ApiInit): Promise<DatabaseHealth> {
  return apiGet<DatabaseHealth>('/admin/system/database', undefined, init);
}

/**
 * Redis at a glance: memory used out of the limit, evictions per minute, hit rate, clients and latency. A full cache
 * that evicts keys slows everything else, so it is worth a card of its own.
 * Assumed contract: answer `CacheHealth`; no query. `memory.maxBytes` is null when Redis has no limit.
 * @route GET /admin/system/cache
 */
export function getCacheHealth(init?: ApiInit): Promise<CacheHealth> {
  return apiGet<CacheHealth>('/admin/system/cache', undefined, init);
}
