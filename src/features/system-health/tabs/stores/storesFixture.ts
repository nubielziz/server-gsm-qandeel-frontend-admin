// Test data for the Data stores tab: a calm `DatabaseHealth` and `CacheHealth` that a test changes field by field, and a
// query result shaped like React Query's. Tests only.
import { vi } from 'vitest';
import type { HealthQuery } from '../../components';
import type { CacheHealth, DatabaseHealth, Measure, MeasureUnit, MetricState } from '../../types';

const MB = 1024 * 1024;
const GB = 1024 * MB;

/** A `Measure` with the limits the server would send for it. */
export function measure(
  value: number | null,
  unit: MeasureUnit,
  state: MetricState = 'ok',
  limits: Pick<Measure, 'warn' | 'crit'> = {},
): Measure {
  return { value, unit, state, ...limits, direction: 'above' };
}

/** A healthy Postgres with one replica and two statements. Pass the fields a test cares about. */
export function databaseHealth(over: Partial<DatabaseHealth> = {}): DatabaseHealth {
  return {
    status: 'ok',
    connections: {
      used: 38,
      max: 100,
      usage: measure(38, 'percent', 'ok', { warn: 70, crit: 90 }),
      poolWait: measure(4, 'ms', 'ok', { warn: 50, crit: 500 }),
      waitingClients: 0,
    },
    locks: { waiting: 0, longestWait: measure(0, 's', 'ok', { warn: 5, crit: 30 }) },
    replicaLag: measure(0.4, 's', 'ok', { warn: 5, crit: 30 }),
    size: { bytes: Math.round(18.4 * GB), growthPerDayBytes: 310 * MB },
    pendingMigrations: [],
    slowQueries: [
      {
        id: '2210948872210445613',
        query:
          'SELECT le.account_id, SUM(le.amount) FROM ledger_entries le WHERE le.account_id = ANY($1) GROUP BY le.account_id',
        calls: 9804,
        meanMs: 33.5,
        totalMs: 328_434,
      },
      {
        id: '-5094417722198840017',
        query: 'UPDATE orders SET status = $1, updated_at = now() WHERE id = $2',
        calls: 61_233,
        meanMs: 12.8,
        totalMs: 783_782,
      },
    ],
    longTransactions: [],
    ...over,
  };
}

/** A healthy Redis with a 2 GB limit. */
export function cacheHealth(over: Partial<CacheHealth> = {}): CacheHealth {
  return {
    status: 'ok',
    memory: {
      usedBytes: 412 * MB,
      maxBytes: 2 * GB,
      usage: measure(20.1, 'percent', 'ok', { warn: 75, crit: 90 }),
    },
    evictionsPerMin: measure(0, 'per_min', 'ok', { warn: 10, crit: 100 }),
    hitRate: { value: 97.8, unit: 'percent', state: 'ok', warn: 90, crit: 70, direction: 'below' },
    clients: measure(38, 'count', 'ok', { warn: 400, crit: 900 }),
    latency: measure(0.4, 'ms', 'ok', { warn: 5, crit: 25 }),
    ...over,
  };
}

/** A query result in the shape a HealthCard reads: an answer, or (with `data` undefined) whatever the test says. */
export function queryOf<T>(data: T | undefined, over: Partial<HealthQuery<T>> = {}): HealthQuery<T> {
  return {
    data,
    error: null,
    isPending: data === undefined,
    isError: false,
    isFetching: false,
    dataUpdatedAt: Date.now(),
    refetch: vi.fn(),
    ...over,
  };
}
