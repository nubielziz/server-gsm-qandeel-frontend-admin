// Step 3 of Quick add: the publish run the server made from the Quick add run ("Also put them on the shop"), read every 5 seconds
// while it is going. The runs list is the storefront feature's API, reached through its index; the answer is one run or none. When a
// run this step saw working ends, the Catalog table is made stale: its rows show which services went on the shop.
import { useInvalidate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { listPublishRuns, type PublishRun } from '@/features/storefront';
import type { Id } from '@/lib/api';
import { CATALOG_ROWS_KEY, useApiQuery } from '@/lib/query';
import { publishPollDelay, wantsPublishLine } from '../lib/quickAddPublish';
import type { QuickAddRun } from '../types';
import { SUPPLIER_QUICK_ADD_PUBLISH_KEY } from './keys';

// The states in which the server still works on a run (the same ones the step reads it again for).
const isWorking = (run: PublishRun) =>
  run.status === 'preparing' || run.status === 'queued' || run.status === 'running';

/**
 * The newest publish run of an ended Quick add run that asked to publish. `wanted` is false for a run that did not ask, is still
 * going or made nothing: nothing is read then. `readAt` is when the last answer arrived (the clock of "no run after 2 minutes").
 * Needs `storefront:read`; without it the read fails and the line says so.
 */
export function useQuickAddPublishRun(quick: QuickAddRun) {
  const wanted = wantsPublishLine(quick);
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();
  // The runs seen working here: only those that end while the step watches refresh the Catalog table.
  const seenWorking = useRef(new Set<Id>());
  const query = useApiQuery({
    queryKey: [...SUPPLIER_QUICK_ADD_PUBLISH_KEY, quick.id],
    queryFn: ({ signal }) =>
      listPublishRuns(
        { filters: { quickAddRunId: quick.id }, start: 0, end: 1, sort: ['id'], order: ['desc'] },
        { signal },
      ),
    enabled: wanted,
    refetchInterval: (read) =>
      read.state.status === 'error'
        ? false
        : publishPollDelay(quick, read.state.data?.data[0], read.state.dataUpdatedAt),
  });
  const run = query.data?.data[0];

  useEffect(() => {
    if (!run) return;
    if (isWorking(run)) {
      seenWorking.current.add(run.id);
      return;
    }
    if (!seenWorking.current.delete(run.id)) return;
    void invalidate({ resource: 'services', invalidates: ['list', 'many', 'detail'] });
    void queryClient.invalidateQueries({ queryKey: CATALOG_ROWS_KEY });
  }, [run, invalidate, queryClient]);

  return { wanted, run, readAt: query.dataUpdatedAt, query };
}
