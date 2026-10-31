// LongTransactionsCard: transactions open for a long time (`GET /admin/system/database`, `longTransactions`). Data stores tab.
import { SkeletonTable } from '@/components/ui';
import { HealthCard, ResponsiveTable, type HealthQuery } from '../../components';
import { POLL } from '../../hooks';
import type { DatabaseHealth } from '../../types';
import { ListNote } from './ListNote';
import { LONG_TRANSACTION_COLUMNS } from './listColumns';
import { emptyListNote, longestFirst } from './storeFigures';

/**
 * Longest first, because that one holds locks the longest. An empty list is a quiet line, not a big empty state: it is the
 * normal case. A database that is down says it could not be read instead.
 */
export function LongTransactionsCard({ query }: { query: HealthQuery<DatabaseHealth> }) {
  return (
    <HealthCard
      title="Long transactions"
      sub="Open for a long time. They hold locks and block vacuum."
      query={query}
      interval={POLL.normal}
      permission="system:read"
      errorTitle="Could not load the long transactions"
      skeleton={<SkeletonTable cols={4} rows={2} />}
      flush
    >
      {(db) =>
        db.longTransactions.length === 0 ? (
          <ListNote>{emptyListNote(db.status, 'long transactions')}</ListNote>
        ) : (
          <ResponsiveTable
            columns={LONG_TRANSACTION_COLUMNS}
            rows={longestFirst(db.longTransactions)}
            rowKey={(row) => row.pid}
            caption="Long transactions"
            cardTitle="query"
          />
        )
      }
    </HealthCard>
  );
}
