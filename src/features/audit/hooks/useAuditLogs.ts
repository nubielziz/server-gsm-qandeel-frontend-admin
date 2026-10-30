// The audit log as Refine reads it: pages of entries, newest first, that "Show more" adds to the end, and one entry for the
// rows that came without their before and after. Ports the data side of auditRows / `ui.audit.limit` in 47-p-audit.js.
import { useInfiniteList, useOne } from '@refinedev/core';
import { useMemo } from 'react';
import type { Id } from '@/lib/api';
import { joinPages } from '../lib/pages';
import { AUDIT_PAGE_SIZE, toRefineFilters } from '../lib/view';
import type { AuditFilters, AuditLog } from '../types';

/**
 * `rows` is every entry loaded so far, joined in order; `total` is what the server counted for the whole filter
 * (`x-total-count`). `loadMore` asks for the next page. `query` carries loading and errors; `moreFailed` is true when only
 * the next page failed, so the screen keeps the entries it has and offers to try again.
 */
export function useAuditLogs(filters: AuditFilters) {
  const { result, query } = useInfiniteList<AuditLog>({
    resource: 'audit-logs',
    pagination: { currentPage: 1, pageSize: AUDIT_PAGE_SIZE },
    sorters: [{ field: 'createdAt', order: 'desc' }],
    filters: toRefineFilters(filters),
    // The list shows its own error state with Retry, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  const rows = useMemo(() => joinPages(result.data?.pages ?? []), [result.data]);
  const total = result.data?.pages.at(-1)?.total;
  const loadMore = () => {
    if (!query.isFetchingNextPage) void query.fetchNextPage();
  };
  return {
    rows,
    total,
    hasMore: result.hasNextPage === true,
    loadMore,
    loadingMore: query.isFetchingNextPage,
    moreFailed: query.isFetchNextPageError,
    query,
  };
}

/**
 * One entry, read only when `enabled` (the list row came without a before and after and the person opened it).
 * `entry` stays undefined until it loads.
 */
export function useAuditLog(id: Id, enabled: boolean) {
  const { result, query } = useOne<AuditLog>({
    resource: 'audit-logs',
    id,
    queryOptions: { enabled },
    errorNotification: false,
  });
  return { entry: result, query };
}
