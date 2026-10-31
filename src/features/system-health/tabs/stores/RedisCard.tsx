// RedisCard: the Redis card of the Data stores tab (`GET /admin/system/cache`): status, memory meter, evictions, hit rate,
// clients and latency. No demo page (docs/system-health-design.md, "Tabs").
import { HealthBadge, HealthCard, type HealthQuery } from '../../components';
import { POLL } from '../../hooks';
import { formatBytes } from '../../lib';
import type { CacheHealth } from '../../types';
import { FigureGrid } from './FigureGrid';
import { measureFigure } from './figures';
import { problemsFirst, usageRatio, type Figure } from './storeFigures';
import { StoreSkeleton } from './StoreSkeleton';
import { UsageMeter } from './UsageMeter';

// Four facts: two columns on a phone, four on a tablet, two again where the card shares the row with Postgres (`xl`).
const COLUMNS = 'grid-cols-2 sm:grid-cols-4 xl:grid-cols-2';

/** The figures in reading order; a figure that is off moves to the front. */
function figuresOf(cache: CacheHealth): Figure[] {
  return problemsFirst([
    measureFigure('evictions', 'Evictions', cache.evictionsPerMin),
    measureFigure('hit-rate', 'Hit rate', cache.hitRate),
    measureFigure('clients', 'Clients', cache.clients),
    measureFigure('latency', 'Latency', cache.latency),
  ]);
}

/**
 * Memory first (the meter), then the four figures. A Redis without a memory limit has nothing to fill, so no bar: the
 * server sends null for it, and Redis itself writes 0 for "no limit", so a zero counts as none too.
 */
function RedisBody({ cache }: { cache: CacheHealth }) {
  const { usedBytes, usage } = cache.memory;
  const limit = cache.memory.maxBytes !== null && cache.memory.maxBytes > 0 ? cache.memory.maxBytes : null;
  return (
    <div className="divide-y divide-line">
      <div className="pb-3">
        <UsageMeter
          label="Memory"
          used={formatBytes(usedBytes)}
          limit={limit === null ? null : formatBytes(limit)}
          ratio={usageRatio(usedBytes, limit)}
          usage={usage}
        />
      </div>
      <div className="pt-3">
        <FigureGrid figures={figuresOf(cache)} columns={COLUMNS} />
      </div>
    </div>
  );
}

/** The cache is a card of its own so a full or slow Redis is seen even while Postgres is fine. */
export function RedisCard({ query }: { query: HealthQuery<CacheHealth> }) {
  return (
    <HealthCard
      title="Redis"
      sub="Cache"
      right={query.data ? <HealthBadge status={query.data.status} /> : undefined}
      query={query}
      interval={POLL.normal}
      permission="system:read"
      errorTitle="Could not load Redis"
      skeleton={<StoreSkeleton cells={4} columns={COLUMNS} />}
      className="h-full"
    >
      {(cache) => <RedisBody cache={cache} />}
    </HealthCard>
  );
}
