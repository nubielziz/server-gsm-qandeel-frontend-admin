// The answers of `GET /admin/system/database` (Postgres) and `GET /admin/system/cache` (Redis). Figures are those of a
// small primary with one replica and a 2 GB Redis; the scenarios change them (a heavy supplier backlog, no database).
import type { CacheHealth, CheckStatus, DatabaseHealth, LongTransaction, SlowQuery } from '../types';
import { nowOf } from './signal';
import type { HealthState } from './state';
import { SPEC, measure } from './thresholds';

const MB = 1024 * 1024;
const GB = 1024 * MB;

// A figure that drifts a little from minute to minute around a level.
const wiggle = (name: string, level: number, noise: number, now: number): number =>
  nowOf({ name: `stores:${name}`, calm: level, day: 'flat', noise }, now);

type Story = 'calm' | 'slow' | 'outage';
const storyOf = (state: HealthState): Story =>
  state.profile.dbDown ? 'outage' : state.profile.slowSupplier ? 'slow' : 'calm';

const DB = {
  calm: { used: 38, pool: 4, clients: 0, locks: 0, lockWait: 0, lag: 0.4 },
  slow: { used: 61, pool: 22, clients: 0, locks: 2, lockWait: 3, lag: 0.9 },
  // Out of connections: every slot taken, a long queue behind it, and nothing can be asked of the server.
  outage: { used: 100, pool: 30_000, clients: 184, locks: 0, lockWait: null, lag: null },
} as const;

const QUERIES: { id: string; query: string; calls: number; meanMs: number }[] = [
  {
    id: '-8123450912384712938',
    query:
      'SELECT o.* FROM orders o WHERE o.status = $1 AND o.sla_due_at < now() ORDER BY o.created_at LIMIT $2',
    calls: 18_420,
    meanMs: 41.2,
  },
  {
    id: '2210948872210445613',
    query:
      'SELECT le.account_id, SUM(le.amount) FROM ledger_entries le WHERE le.account_id = ANY($1) GROUP BY le.account_id',
    calls: 9804,
    meanMs: 33.5,
  },
  {
    id: '-5094417722198840017',
    query: 'UPDATE orders SET status = $1, updated_at = now() WHERE id = $2',
    calls: 61_233,
    meanMs: 12.8,
  },
  {
    id: '7740911285566301124',
    query:
      'SELECT * FROM supplier_api_logs WHERE supplier_id = $1 AND created_at > $2 ORDER BY created_at DESC LIMIT $3',
    calls: 24_518,
    meanMs: 9.4,
  },
  {
    id: '-3318852206471209954',
    query:
      'INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, before, after) VALUES ($1, $2, $3, $4, $5, $6)',
    calls: 38_905,
    meanMs: 3.1,
  },
];

// Slowest mean first. With a slow supplier the order queries wait on locks and get six times slower.
function slowQueries(story: Story): SlowQuery[] {
  if (story === 'outage') return [];
  return QUERIES.map((row, i): SlowQuery => {
    const meanMs = story === 'slow' && i < 3 ? Math.round(row.meanMs * 6 * 10) / 10 : row.meanMs;
    return {
      id: row.id,
      query: row.query,
      calls: row.calls,
      meanMs,
      totalMs: Math.round(meanMs * row.calls),
    };
  }).sort((a, b) => b.meanMs - a.meanMs);
}

function longTransactions(story: Story): LongTransaction[] {
  return story === 'slow'
    ? [
        {
          pid: 31_822,
          durationSeconds: 412,
          state: 'idle in transaction',
          query: 'UPDATE orders SET status = $1 WHERE id = $2',
        },
      ]
    : [];
}

/** `GET /admin/system/database`. */
export function buildDatabase(state: HealthState, now: number): DatabaseHealth {
  const story = storyOf(state);
  const facts = DB[story];
  const max = 100;
  const used = Math.min(max, Math.round(wiggle('db:used', facts.used, 0.05, now)));
  const status: CheckStatus = story === 'outage' ? 'down' : 'ok';
  const lockWait = facts.lockWait === null ? null : wiggle('db:lockwait', facts.lockWait, 0.1, now);
  return {
    status,
    connections: {
      used,
      max,
      usage: measure(SPEC.connections, (used / max) * 100),
      poolWait: measure(SPEC.poolWait, wiggle('db:pool', facts.pool, 0.1, now)),
      waitingClients: facts.clients,
    },
    locks: { waiting: facts.locks, longestWait: measure(SPEC.lockWait, lockWait) },
    // The one scenario with no replica shows that state; with no database there is nothing to measure.
    replicaLag:
      state.scenario === 'maintenance'
        ? null
        : measure(SPEC.replicaLag, facts.lag === null ? null : wiggle('db:lag', facts.lag, 0.2, now)),
    size: { bytes: Math.round(18.4 * GB), growthPerDayBytes: Math.round(310 * MB) },
    // A migration waits for the maintenance window.
    pendingMigrations: state.scenario === 'maintenance' ? ['20261029093000_add_alert_rule_unit'] : [],
    slowQueries: slowQueries(story),
    longTransactions: longTransactions(story),
  };
}

const REDIS = {
  calm: { used: 412, hit: 97.8, clients: 38, latency: 0.4 },
  slow: { used: 520, hit: 96.9, clients: 64, latency: 0.7 },
  // Cache stays up while the database is down; the apps open more connections to it.
  outage: { used: 640, hit: 91.5, clients: 480, latency: 1.9 },
} as const;

/** `GET /admin/system/cache`. */
export function buildCache(state: HealthState, now: number): CacheHealth {
  const facts = REDIS[storyOf(state)];
  const maxBytes = 2 * GB;
  const usedBytes = Math.round(wiggle('redis:used', facts.used, 0.02, now) * MB);
  return {
    status: 'ok',
    memory: { usedBytes, maxBytes, usage: measure(SPEC.memory, (usedBytes / maxBytes) * 100) },
    evictionsPerMin: measure(SPEC.evictions, 0),
    hitRate: measure(SPEC.hitRate, Math.min(100, wiggle('redis:hit', facts.hit, 0.004, now))),
    clients: measure(SPEC.clients, Math.round(wiggle('redis:clients', facts.clients, 0.04, now))),
    latency: measure(SPEC.redisLatency, wiggle('redis:latency', facts.latency, 0.15, now)),
  };
}
