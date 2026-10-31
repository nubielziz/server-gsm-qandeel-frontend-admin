// SlowQueriesCard: the slowest SQL statements of the database (`GET /admin/system/database`, `slowQueries`). Data stores tab.
import { SkeletonTable } from '@/components/ui';
import { HealthCard, ResponsiveTable, type HealthQuery } from '../../components';
import { POLL } from '../../hooks';
import type { DatabaseHealth } from '../../types';
import { ListNote } from './ListNote';
import { SLOW_QUERY_COLUMNS } from './listColumns';
import { emptyListNote } from './storeFigures';

/**
 * Statements as the server ranks them, slowest mean first; the order is not changed here. With none, a database that is
 * down says it could not be read, never "no slow queries". On a phone each statement is a card.
 */
export function SlowQueriesCard({ query }: { query: HealthQuery<DatabaseHealth> }) {
  return (
    <HealthCard
      title="Slow queries"
      sub="Slowest first, by mean time"
      query={query}
      interval={POLL.normal}
      permission="system:read"
      errorTitle="Could not load the slow queries"
      skeleton={<SkeletonTable cols={5} rows={3} />}
      flush
    >
      {(db) =>
        db.slowQueries.length === 0 ? (
          <ListNote>{emptyListNote(db.status, 'slow queries')}</ListNote>
        ) : (
          <ResponsiveTable
            columns={SLOW_QUERY_COLUMNS}
            rows={db.slowQueries}
            rowKey={(row) => row.id}
            caption="Slow queries"
            cardTitle="query"
          />
        )
      }
    </HealthCard>
  );
}
