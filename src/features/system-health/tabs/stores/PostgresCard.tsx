// PostgresCard: the Postgres card of the Data stores tab (`GET /admin/system/database`): status, connections meter, the
// figures that show pressure, size and pending migrations. No demo page (docs/system-health-design.md, "Tabs").
import { num } from '@/lib/format';
import { HealthBadge, HealthCard, type HealthQuery } from '../../components';
import { POLL } from '../../hooks';
import { formatBytes } from '../../lib';
import type { DatabaseHealth } from '../../types';
import { FigureGrid } from './FigureGrid';
import { measureFigure, noDataFigure, plainFigure } from './figures';
import { PendingMigrations } from './PendingMigrations';
import { growthText, isUnreadZero, problemsFirst, usageRatio, type Figure } from './storeFigures';
import { StoreSkeleton } from './StoreSkeleton';
import { UsageMeter } from './UsageMeter';

// Six facts: two columns on a phone, three from `sm` up (a card is wide at every size above that).
const COLUMNS = 'grid-cols-2 sm:grid-cols-3';

/**
 * The figures in the order they read best when all is well; a figure that is off, or has no reading, moves to the front.
 * Waiting clients and waiting locks are bare counts the server sends no state for, so they are printed as sent (the
 * one exception is noted on the locks).
 */
function figuresOf(db: DatabaseHealth): Figure[] {
  const { connections, locks, replicaLag, size } = db;
  return problemsFirst([
    measureFigure('pool-wait', 'Pool wait', connections.poolWait),
    plainFigure('waiting-clients', 'Waiting clients', num(connections.waitingClients)),
    // A zero from a database that is down or unknown is no answer: beside "Longest lock wait: No data" it would read as real.
    isUnreadZero(locks.waiting, db.status)
      ? noDataFigure('locks-waiting', 'Locks waiting')
      : plainFigure('locks-waiting', 'Locks waiting', num(locks.waiting)),
    measureFigure('lock-wait', 'Longest lock wait', locks.longestWait),
    // No replica is a setup, not a missing reading: it says so in plain words.
    replicaLag
      ? measureFigure('replica-lag', 'Replica lag', replicaLag)
      : plainFigure('replica-lag', 'Replica lag', <span className="text-ink3">No replica</span>),
    plainFigure('size', 'Size', formatBytes(size.bytes), growthText(size.growthPerDayBytes)),
  ]);
}

/** The card's content once the answer is there. A numeric reading that is null prints "No data", never zero. */
function PostgresBody({ db }: { db: DatabaseHealth }) {
  const { connections } = db;
  return (
    <div className="divide-y divide-line">
      <div className="pb-3">
        <UsageMeter
          label="Connections"
          used={num(connections.used)}
          limit={num(connections.max)}
          ratio={usageRatio(connections.used, connections.max)}
          usage={connections.usage}
        />
      </div>
      <div className="py-3">
        <FigureGrid figures={figuresOf(db)} columns={COLUMNS} />
      </div>
      <div className="pt-3">
        <PendingMigrations names={db.pendingMigrations} status={db.status} />
      </div>
    </div>
  );
}

/**
 * The card reads the same answer as the two lists below it, so when that read fails its error names all three (the tab
 * shows it once, here) and leaves Redis alone. The status badge in the header is the server's word for the database (OK,
 * Degraded, Down, Unknown).
 */
export function PostgresCard({ query }: { query: HealthQuery<DatabaseHealth> }) {
  return (
    <HealthCard
      title="Postgres"
      sub="Primary database"
      right={query.data ? <HealthBadge status={query.data.status} /> : undefined}
      query={query}
      interval={POLL.normal}
      permission="system:read"
      errorTitle="Could not load Postgres, slow queries and long transactions"
      skeleton={<StoreSkeleton cells={6} columns={COLUMNS} />}
      className="h-full"
    >
      {(db) => <PostgresBody db={db} />}
    </HealthCard>
  );
}
