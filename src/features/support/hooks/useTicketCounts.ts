// The four figures above the inbox: open, not yet answered, past the reply target and resolved. Each is the list call with `_start=0&_end=1`,
// read from `x-total-count` (MISMATCHES M20). Ports the open and late figures of `supportStats` (12-state-b2c.js); the median first reply
// and the satisfaction average need an endpoint the map does not have (MISMATCHES M145).
import { useQueries } from '@tanstack/react-query';
import { listSupportTickets } from '../api';
import { toListQuery, UNRESOLVED } from '../lib/filters';
import type { TicketListFilters } from '../types';
import { REFRESH_MS, SUPPORT_COUNTS_KEY } from './keys';

export type TicketCounts = {
  open: number | undefined;
  unanswered: number | undefined;
  late: number | undefined;
  resolved: number | undefined;
};

// The demo counted over all tickets whatever the filter said, so these calls carry no filter of the page.
const SPECS: readonly { id: keyof TicketCounts; filters: TicketListFilters }[] = [
  { id: 'open', filters: { status: [...UNRESOLVED] } },
  { id: 'unanswered', filters: { status: 'new' } },
  { id: 'late', filters: { late: true } },
  { id: 'resolved', filters: { status: 'resolved' } },
];

/** `enabled` is false until the staff member's permissions are known. */
export function useTicketCounts(enabled = true): TicketCounts {
  const results = useQueries({
    queries: SPECS.map((spec) => ({
      queryKey: [...SUPPORT_COUNTS_KEY, spec.id],
      queryFn: async ({ signal }: { signal: AbortSignal }) =>
        (await listSupportTickets(toListQuery(spec.filters, { start: 0, end: 1 }), { signal })).total,
      enabled,
      refetchInterval: REFRESH_MS,
    })),
  });
  const countOf = (id: keyof TicketCounts): number | undefined =>
    results[SPECS.findIndex((spec) => spec.id === id)]?.data;
  return {
    open: countOf('open'),
    unanswered: countOf('unanswered'),
    late: countOf('late'),
    resolved: countOf('resolved'),
  };
}
