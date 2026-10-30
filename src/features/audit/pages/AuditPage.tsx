// AuditPage: "Audit log" (`/audit`, the demo's `pageAudit` in 47-p-audit.js). A header and one panel: the filters, then the
// entries newest first, grouped by day, with the before / after of each. Filters live in the address (`?actor=&type=&q=`),
// and "Show more" loads the next page from the server. The page only composes; an order opens its drawer in place.
import { useMemo } from 'react';
import { cx, PageHeader, Panel, QueryState } from '@/components/ui';
import { OrderDrawerHost, useOrderDrawer } from '@/features/orders';
import { AuditEmpty } from '../components/AuditEmpty';
import { AuditList } from '../components/AuditList';
import { AuditToolbar } from '../components/AuditToolbar';
import { useAuditActors } from '../hooks/useAuditActors';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { useAuditView } from '../hooks/useAuditView';
import { useRecordAccess } from '../hooks/useRecordAccess';
import { hasFilters, toFilters } from '../lib/view';

export function AuditPage() {
  const { view, setView, clear } = useAuditView();
  const filters = useMemo(() => toFilters(view), [view]);
  const logs = useAuditLogs(filters);
  const { actors, roleOf } = useAuditActors();
  const canOpen = useRecordAccess();
  const drawer = useOrderDrawer();
  const { query, rows } = logs;

  return (
    <>
      <PageHeader
        title="Audit log"
        sub="Every change to money, prices, merchants and suppliers, with who and when. Entries can’t be edited or deleted."
      />
      <Panel flush>
        <AuditToolbar view={view} actors={actors} onChange={setView} onClear={clear} total={logs.total} />
        {/* While a new filter loads, the entries of the old one stay (dimmed) so the list does not jump. */}
        <div
          className={cx('border-t border-line transition-opacity', query.isPlaceholderData && 'opacity-60')}
          aria-busy={query.isPlaceholderData || undefined}
        >
          <QueryState
            isLoading={query.isLoading}
            // A failed "Show more" keeps the entries on screen; only a list with nothing to show becomes an error.
            isError={query.isError && rows.length === 0}
            error={query.error}
            onRetry={() => void query.refetch()}
            errorTitle="Could not load the audit log"
            isEmpty={rows.length === 0}
            empty={<AuditEmpty filtered={hasFilters(view)} onClear={clear} />}
          >
            <AuditList
              rows={rows}
              total={logs.total}
              hasMore={logs.hasMore}
              loadingMore={logs.loadingMore}
              moreFailed={logs.moreFailed}
              onMore={logs.loadMore}
              roleOf={roleOf}
              canOpen={canOpen}
              onOpenOrder={drawer.open}
            />
          </QueryState>
        </div>
      </Panel>
      {/* The drawer needs the right to read orders; without it the order is plain text. */}
      {canOpen('orders') && <OrderDrawerHost />}
    </>
  );
}
