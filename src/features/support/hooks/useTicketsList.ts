// The inbox as a Refine list: one page of the tickets that match the filters, late ones first, sorted by the server. Ports
// the data side of ticketRows() (49-p-support.js).
import { useList } from '@refinedev/core';
import { inboxSort, toRefineFilters, type TicketFilter } from '../lib/filters';
import type { SupportTicket, TicketListFilters } from '../types';
import { REFRESH_MS } from './keys';

export type TicketsListArgs = {
  filters: TicketListFilters;
  /** The page's filter, which picks the sort (Resolved has no late tickets). */
  filter: TicketFilter;
  page: number;
  pageSize: number;
  enabled?: boolean;
};

/** `tickets` is the page, `total` what the server counted for the whole filter; `query` carries loading, error and refetch. */
export function useTicketsList({ filters, filter, page, pageSize, enabled = true }: TicketsListArgs) {
  const { result, query } = useList<SupportTicket>({
    resource: 'support-tickets',
    pagination: { currentPage: page, pageSize },
    sorters: inboxSort(filter),
    filters: toRefineFilters(filters),
    queryOptions: { enabled, refetchInterval: REFRESH_MS },
    // The inbox shows its own error state with Retry, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { tickets: result.data, total: result.total, query };
}
