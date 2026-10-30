// The numbers above the table: the strip's figures and the counts on the tab chips. Each count is a list call with
// `_start=0&_end=1`, read from `x-total-count` (the same way as the orders tabs); the money comes from the payments report's
// totals, so the console adds no money. A call is made only when the staff member may read what it needs.
import { useApiQuery } from '@/lib/query';
import { getPaymentsReport, listDisputes, listRefunds } from '../api';
import type { RefundFigures } from '../lib/figures';
import type { DisputeStatus, RefundStatus } from '../types';
import { FIGURES_KEY, REFRESH_MS } from './keys';

const countRefunds = async (status: RefundStatus, signal: AbortSignal) =>
  (await listRefunds({ start: 0, end: 1, filters: { status } }, { signal })).total;

const countDisputes = async (status: DisputeStatus, signal: AbortSignal) =>
  (await listDisputes({ start: 0, end: 1, filters: { status } }, { signal })).total;

/**
 * The figures and the chip counts. `can` answers a permission; `enabled` is false until the staff member's permissions are
 * known. A figure is undefined until its call has answered (or when the staff member may not read it).
 */
export function useRefundFigures(can: (permission: string) => boolean, enabled: boolean) {
  const refunds = enabled && can('refunds:read');
  const disputes = enabled && can('disputes:read');
  const finance = enabled && can('reports:finance');

  const requested = useApiQuery({
    queryKey: [...FIGURES_KEY, 'requested'],
    queryFn: ({ signal }) => countRefunds('requested', signal),
    enabled: refunds,
    refetchInterval: REFRESH_MS,
  });
  const failed = useApiQuery({
    queryKey: [...FIGURES_KEY, 'failed'],
    queryFn: ({ signal }) => countRefunds('failed', signal),
    enabled: refunds,
    refetchInterval: REFRESH_MS,
  });
  // The disputes that wait for evidence, soonest deadline first: the total is the count, the first row is the next due.
  const waiting = useApiQuery({
    queryKey: [...FIGURES_KEY, 'needs_response'],
    queryFn: ({ signal }) =>
      listDisputes(
        {
          start: 0,
          end: 1,
          sort: ['evidenceDueAt'],
          order: ['asc'],
          filters: { status: 'needs_response' },
        },
        { signal },
      ),
    select: (result) => ({ count: result.total, next: result.data[0] ?? null }),
    enabled: disputes,
    refetchInterval: REFRESH_MS,
  });
  const review = useApiQuery({
    queryKey: [...FIGURES_KEY, 'under_review'],
    queryFn: ({ signal }) => countDisputes('under_review', signal),
    enabled: disputes,
    refetchInterval: REFRESH_MS,
  });
  const report = useApiQuery({
    queryKey: [...FIGURES_KEY, 'totals'],
    queryFn: ({ signal }) => getPaymentsReport({ start: 0, end: 1 }, { signal }),
    select: (result) => result.totals,
    enabled: finance,
    refetchInterval: REFRESH_MS,
  });

  const figures: RefundFigures = {
    requested: requested.data,
    failed: failed.data,
    needsResponse: waiting.data?.count,
    underReview: review.data,
    nextDue: waiting.data ? waiting.data.next : undefined,
    totals: report.data,
  };
  return figures;
}
