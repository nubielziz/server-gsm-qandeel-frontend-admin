// InboxView: the inbox: the figures, then the ticket list on the left and the open thread on the right. Ports the body of pageSupport
// (49-p-support.js). The open thread is `?ticket=<id>` in the address; with none, the list's first ticket shows on a wide screen.
// On a phone the list and the thread take turns (the demo's `ui.support.open`).
import { useState } from 'react';
import { cx, EmptyState, usePageClamp } from '@/components/ui';
import { OrderDrawerHost } from '@/features/orders';
import { useNow } from '@/lib/format';
import type { ComposerState } from '../hooks/useComposerState';
import type { SupportGrants } from '../hooks/useSupportGrants';
import { useSupportView } from '../hooks/useSupportView';
import { useTicketCounts } from '../hooks/useTicketCounts';
import { useTicketsList } from '../hooks/useTicketsList';
import { hasActiveFilters, PAGE_SIZE, toListFilters } from '../lib/filters';
import { SupportStats } from './SupportStats';
import { TicketList } from './TicketList';
import { TicketThread } from './TicketThread';

export interface InboxViewProps {
  grants: SupportGrants;
  composer: ComposerState;
}

export function InboxView({ grants, composer }: InboxViewProps) {
  const view = useSupportView();
  const now = useNow();
  const { filters } = view;
  // The ticket the staff member just chose, so its composer takes the cursor; any filter change forgets it.
  const [chosen, setChosen] = useState<number | null>(null);

  // Mine needs the staff member's id, so the first request waits for `me`.
  const ready = grants.ready;
  const counts = useTicketCounts(ready);
  const list = useTicketsList({
    filters: toListFilters(filters, grants.me?.id),
    filter: filters.filter,
    page: view.page,
    pageSize: PAGE_SIZE,
    enabled: ready,
  });
  // A shrinking list (a refresh, an old link) must not leave the inbox on an empty page.
  usePageClamp({
    page: view.page,
    pageSize: PAGE_SIZE,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage: view.setPage,
  });

  const selectedId = view.ticketId ?? list.tickets[0]?.id ?? null;
  const open = view.ticketId !== null;
  const inboxEmpty = counts.open === 0 && counts.resolved === 0;

  // Only a wide screen puts the cursor in the composer; on a phone it would open the keyboard over the thread.
  function choose(id: number) {
    setChosen(window.matchMedia?.('(min-width: 1024px)').matches ? id : null);
    view.select(id);
  }

  return (
    <>
      <SupportStats counts={counts} />
      <div className="panel grid lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
        <TicketList
          tickets={list.tickets}
          total={list.total}
          state={{
            isLoading: list.query.isLoading || !ready,
            isError: list.query.isError,
            error: list.query.error,
            refetch: () => void list.query.refetch(),
          }}
          filters={filters}
          page={view.page}
          selectedId={selectedId}
          now={now}
          hiddenOnPhone={open}
          inboxEmpty={inboxEmpty}
          filtersOn={hasActiveFilters(filters)}
          onFiltersChange={(patch) => {
            setChosen(null);
            view.setFilters(patch);
          }}
          onReset={view.resetFilters}
          onSelect={choose}
          onPageChange={view.setPage}
        />
        <div className={cx('min-w-0 border-line lg:border-s', !open && 'hidden lg:block')}>
          {selectedId === null ? (
            <EmptyState icon="mail" title="Select a ticket">
              The conversation opens here, with the order and payment next to it.
            </EmptyState>
          ) : (
            <TicketThread
              key={selectedId}
              id={selectedId}
              grants={grants}
              composer={composer}
              focusComposer={chosen === selectedId}
              onBack={view.closeThread}
            />
          )}
        </div>
      </div>
      <OrderDrawerHost />
    </>
  );
}
