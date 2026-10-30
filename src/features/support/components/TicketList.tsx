// TicketList: the left column of the inbox: the toolbar, the ticket rows (loading, error and empty states included) and the
// pager. Ports the `list` panel of pageSupport (49-p-support.js). On a phone it hides while a thread is open.
import { cx, Pager, QueryState, SkeletonTable } from '@/components/ui';
import { PAGE_SIZE, type SupportFilters } from '../lib/filters';
import type { SupportTicket } from '../types';
import { TicketRow } from './TicketRow';
import { TicketsEmpty } from './TicketsEmpty';
import { TicketToolbar } from './TicketToolbar';

export interface TicketListProps {
  tickets: readonly SupportTicket[];
  total: number | undefined;
  state: { isLoading: boolean; isError: boolean; error: unknown; refetch: () => void };
  filters: SupportFilters;
  page: number;
  selectedId: number | null;
  now: number;
  /** A phone shows the thread alone while one is open. */
  hiddenOnPhone: boolean;
  /** No ticket exists at all. */
  inboxEmpty: boolean;
  filtersOn: boolean;
  onFiltersChange: (patch: Partial<SupportFilters>) => void;
  onReset: () => void;
  onSelect: (id: number) => void;
  onPageChange: (page: number) => void;
}

export function TicketList({
  tickets,
  total,
  state,
  filters,
  page,
  selectedId,
  now,
  hiddenOnPhone,
  inboxEmpty,
  filtersOn,
  onFiltersChange,
  onReset,
  onSelect,
  onPageChange,
}: TicketListProps) {
  return (
    <div className={cx('min-w-0', hiddenOnPhone && 'hidden lg:block')}>
      <TicketToolbar
        filters={filters}
        onChange={onFiltersChange}
        customerName={filters.customerId === null ? undefined : tickets[0]?.requester.name}
      />
      <QueryState
        isLoading={state.isLoading}
        isError={state.isError}
        error={state.error}
        errorTitle="Could not load the tickets"
        onRetry={state.refetch}
        skeleton={<SkeletonTable cols={2} rows={6} />}
        isEmpty={tickets.length === 0}
        empty={<TicketsEmpty inboxEmpty={inboxEmpty} filtersOn={filtersOn} onReset={onReset} />}
      >
        <ul
          className="m-0 max-h-[640px] list-none divide-y divide-line overflow-y-auto p-0"
          aria-label="Tickets"
        >
          {tickets.map((ticket) => (
            <TicketRow
              key={ticket.id}
              ticket={ticket}
              selected={ticket.id === selectedId}
              now={now}
              onSelect={onSelect}
            />
          ))}
        </ul>
        {total !== undefined && total > PAGE_SIZE && (
          <Pager page={page} pageSize={PAGE_SIZE} total={total} onPageChange={onPageChange} />
        )}
      </QueryState>
    </div>
  );
}
