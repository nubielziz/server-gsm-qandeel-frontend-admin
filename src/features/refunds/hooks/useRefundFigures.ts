// The numbers of the refund views: the Overview's figures and the counts on the Money back links. Each count is a list call with
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
 * The refunds that wait for a person: the ones to decide (`requested`) and the ones to retry (`failed`). Each is undefined until its call
 * has answered. The Overview figures and the Money back count read these same queries, so a decision refreshes both.
 */
export function useWaitingRefunds(enabled: boolean) {
  const requested = useApiQuery({
    queryKey: [...FIGURES_KEY, 'requested'],
    queryFn: ({ signal }) => countRefunds('requested', signal),
    enabled,
    refetchInterval: REFRESH_MS,
  });
  const failed = useApiQuery({
    queryKey: [...FIGURES_KEY, 'failed'],
    queryFn: ({ signal }) => countRefunds('failed', signal),
    enabled,
    refetchInterval: REFRESH_MS,
  });
  return { requested: requested.data, failed: failed.data };
}

/**
 * The disputes that wait for evidence, soonest deadline first: `count` is the total, `next` the first row (the next one due). The data is
 * undefined until the call has answered. Shared by the Overview figures and the Money back count, like `useWaitingRefunds`.
 */
export function useDisputesNeedingEvidence(enabled: boolean) {
  return useApiQuery({
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
    enabled,
    refetchInterval: REFRESH_MS,
  });
}

/**
 * The figures of the Overview. `can` answers a permission; `enabled` is false until the staff member's permissions are known. A figure
 * is undefined until its call has answered (or when the staff member may not read it).
 */
export function useRefundFigures(can: (permission: string) => boolean, enabled: boolean) {
  const refunds = enabled && can('refunds:read');
  const disputes = enabled && can('disputes:read');
  const finance = enabled && can('reports:finance');

  const { requested, failed } = useWaitingRefunds(refunds);
  const waiting = useDisputesNeedingEvidence(disputes);
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
    requested,
    failed,
    needsResponse: waiting.data?.count,
    underReview: review.data,
    nextDue: waiting.data ? waiting.data.next : undefined,
    totals: report.data,
  };
  return figures;
}
