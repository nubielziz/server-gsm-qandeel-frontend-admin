// CheckoutsPage: "Abandoned checkouts" (`/checkouts`, the demo's `pageCheckouts` in 51-p-checkouts.js). People who typed an email
// and left, a "Needs a reminder / All" filter, a search, a bulk Send reminder, and the new Sales funnel panel. The filter, search,
// page and sort live in the address (`?filter=all&q=sam`). The page only composes; the server filters, sorts, counts and decides who
// may be emailed (consent, once only).
import { useState } from 'react';
import { PageHeader, Panel, usePageClamp, useRowSelection } from '@/components/ui';
import { useNow } from '@/lib/format';
import { CheckoutsEmpty } from '../components/CheckoutsEmpty';
import { CheckoutsTable } from '../components/CheckoutsTable';
import { CheckoutsToolbar } from '../components/CheckoutsToolbar';
import { FunnelPanel } from '../components/FunnelPanel';
import { RecoverSummaryDialog } from '../components/RecoverSummaryDialog';
import { useAbandonedCheckouts } from '../hooks/useAbandonedCheckouts';
import { useCheckoutGrants } from '../hooks/useCheckoutGrants';
import { useCheckoutView } from '../hooks/useCheckoutView';
import { useRecoverCheckouts } from '../hooks/useRecoverCheckouts';
import { hasSearch, PAGE_SIZE } from '../lib/filters';
import type { RecoverCheckoutsResult } from '../types';

export function CheckoutsPage() {
  const grants = useCheckoutGrants();
  const view = useCheckoutView();
  const now = useNow();
  const selection = useRowSelection<number>();
  const [summary, setSummary] = useState<RecoverCheckoutsResult | null>(null);

  const list = useAbandonedCheckouts({
    filters: view.filters,
    page: view.page,
    sort: view.sort,
    enabled: grants.ready,
  });
  // A shrinking list (a send, the refresh, an old link) must not leave the table on an empty page.
  usePageClamp({
    page: view.page,
    pageSize: PAGE_SIZE,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage: view.setPage,
  });

  // A send that left some checkouts out is told in a dialog; one that reached everyone only shows the toast.
  const recover = useRecoverCheckouts((result) => {
    if (result.skipped.length > 0) setSummary(result);
  });

  // Ticks are cleared when the list changes under them, so no checkout is acted on out of sight.
  const keepTicks =
    <Args extends unknown[]>(change: (...args: Args) => void) =>
    (...args: Args) => {
      selection.clear();
      change(...args);
    };

  // Ticked rows the server says can be reminded; the others in the selection are left out of the send and said so in the bar.
  const ticked = list.rows.filter((checkout) => selection.has(checkout.id));
  const sendable = ticked.filter((checkout) => checkout.canRecover);

  return (
    <>
      <PageHeader
        title="Abandoned checkouts"
        sub="People who left an email at checkout but never paid, and the reminder that brings them back."
      />
      <Panel
        title="Abandoned checkouts"
        sub="People who typed an email and left. A reminder goes out automatically after the delay set in Settings, to customers who agreed to marketing email; here you can send one by hand."
        flush
      >
        <CheckoutsToolbar
          filters={view.filters}
          onChange={keepTicks(view.setFilters)}
          total={list.total}
          picked={ticked.length}
          sendable={sendable.length}
          grants={grants}
          sending={recover.isPending}
          // The bar sends the ticked rows the server says can be reminded; once it is done every tick goes, like the demo's.
          onSend={() =>
            recover.mutate(
              sendable.map((checkout) => checkout.id),
              { onSuccess: () => selection.clear() },
            )
          }
        />
        <CheckoutsTable
          rows={list.rows}
          state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
          error={list.query.error}
          onRetry={() => void list.query.refetch()}
          now={now}
          grants={grants}
          sort={view.sort}
          onSortChange={keepTicks(view.setSort)}
          pagination={{ page: view.page, pageSize: PAGE_SIZE, total: list.total ?? list.rows.length }}
          onPageChange={keepTicks(view.setPage)}
          selection={selection}
          sending={recover.isPending}
          // A row's own button leaves the other ticks alone.
          onRemind={(checkout) =>
            recover.mutate([checkout.id], { onSuccess: () => selection.toggle(checkout.id, false) })
          }
          empty={
            <CheckoutsEmpty
              filter={view.filters.filter}
              searching={hasSearch(view.filters)}
              onShowAll={() => keepTicks(view.setFilters)({ filter: 'all' })}
              onClearSearch={keepTicks(view.clearSearch)}
            />
          }
        />
      </Panel>
      {grants.can('reports:growth') && <FunnelPanel days={view.days} onDaysChange={view.setDays} />}
      {summary && <RecoverSummaryDialog result={summary} onClose={() => setSummary(null)} />}
    </>
  );
}
