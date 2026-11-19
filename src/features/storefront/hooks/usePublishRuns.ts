// The earlier publish runs, one page at a time, newest first (the history under the Publish tab's start). The rows of a run are in
// `usePublishItems`. The previous page stays on screen while the next one loads, so the table does not flash.
import { keepPreviousData } from '@tanstack/react-query';
import type { SortState } from '@/components/ui';
import { useApiQuery } from '@/lib/query';
import { listPublishRuns } from '../api';
import { PUBLISH_RUNS_KEY } from './keys';

/** What the history asks the server for. */
export type PublishRunsArgs = { page: number; pageSize: number; sort: SortState; enabled?: boolean };

/** `rows` is the page, `total` what the server counted; `query` carries loading, error and refetch. Needs `storefront:read`. */
export function usePublishRuns({ page, pageSize, sort, enabled = true }: PublishRunsArgs) {
  const query = useApiQuery({
    queryKey: [...PUBLISH_RUNS_KEY, page, pageSize, sort.field, sort.order],
    queryFn: ({ signal }) =>
      listPublishRuns(
        {
          start: (page - 1) * pageSize,
          end: page * pageSize,
          sort: [sort.field],
          order: [sort.order],
        },
        { signal },
      ),
    placeholderData: keepPreviousData,
    enabled,
  });
  return { rows: query.data?.data ?? [], total: query.data?.total, query };
}
