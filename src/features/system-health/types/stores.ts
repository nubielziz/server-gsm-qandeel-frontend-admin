// Data stores: `GET /admin/system/database` (Postgres) and `GET /admin/system/cache` (Redis). Assumed contract.
import type { CheckStatus, Measure } from './common';

/** One normalized statement of `pg_stat_statements`, slowest mean first. */
export interface SlowQuery {
  /** `queryid`, shown in mono. */
  id: string;
  query: string;
  calls: number;
  meanMs: number;
  totalMs: number;
}

/** A transaction open for a long time (it holds locks and blocks vacuum). */
export interface LongTransaction {
  pid: number;
  durationSeconds: number;
  state: string;
  query: string;
}

/** Answer of `GET /admin/system/database`. `replicaLag` is null when there is no replica. */
export interface DatabaseHealth {
  status: CheckStatus;
  connections: { used: number; max: number; usage: Measure; poolWait: Measure; waitingClients: number };
  locks: { waiting: number; longestWait: Measure };
  replicaLag: Measure | null;
  size: { bytes: number; growthPerDayBytes: number | null };
  pendingMigrations: string[];
  slowQueries: SlowQuery[];
  longTransactions: LongTransaction[];
}

/** Answer of `GET /admin/system/cache`. `maxBytes` is null when Redis has no memory limit. */
export interface CacheHealth {
  status: CheckStatus;
  memory: { usedBytes: number; maxBytes: number | null; usage: Measure };
  evictionsPerMin: Measure;
  hitRate: Measure;
  clients: Measure;
  latency: Measure;
}
