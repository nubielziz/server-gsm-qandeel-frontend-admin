// Step 3 of Quick add: the publish run the server made from the Quick add run ("Also put them on the shop"), read every 5 seconds
// while it is going. The runs list is the storefront feature's API, reached through its index; the answer is one run or none.
import { listPublishRuns } from '@/features/storefront';
import { useApiQuery } from '@/lib/query';
import { publishPollDelay, wantsPublishLine } from '../lib/quickAddPublish';
import type { QuickAddRun } from '../types';
import { SUPPLIER_QUICK_ADD_PUBLISH_KEY } from './keys';

/**
 * The newest publish run of an ended Quick add run that asked to publish. `wanted` is false for a run that did not ask, is still
 * going or made nothing: nothing is read then. `readAt` is when the last answer arrived (the clock of "no run after 2 minutes").
 * Needs `storefront:read`; without it the read fails and the line says so.
 */
export function useQuickAddPublishRun(quick: QuickAddRun) {
  const wanted = wantsPublishLine(quick);
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
  return { wanted, run: query.data?.data[0], readAt: query.dataUpdatedAt, query };
}
