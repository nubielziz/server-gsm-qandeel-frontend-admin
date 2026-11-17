// The rows of one publish run, server-paged (50 a page), filtered, searched and sorted by the server. The previous page stays on
// screen while the next one loads. A change to the run (an edit, a bulk action, a publish) makes every page stale through
// `PUBLISH_ITEMS_KEY`. The result of a finished run and the preview of a draft read the same rows.
import { keepPreviousData } from '@tanstack/react-query';
import type { SortState } from '@/components/ui';
import type { Id } from '@/lib/api';
import { useApiQuery } from '@/lib/query';
import { listPublishItems } from '../api';
import { PUBLISH_ITEMS_PAGE } from '../lib/views';
import type { PublishItemFilters } from '../types';
import { PUBLISH_ITEMS_KEY } from './keys';

/** What a page of rows asks for: the search text, the filters, the page and the sort. */
export type PublishItemsArgs = {
  q: string;
  filters: PublishItemFilters;
  page: number;
  sort: SortState;
  enabled?: boolean;
};

/** `rows` is the page, `total` what the server counted for the whole filter; `query` carries loading, error and refetch. */
export function usePublishItems(
  runId: Id | null,
  { q, filters, page, sort, enabled = true }: PublishItemsArgs,
) {
  const query = useApiQuery({
    queryKey: [...PUBLISH_ITEMS_KEY, runId, q, filters, page, sort.field, sort.order],
    queryFn: ({ signal }) =>
      listPublishItems(
        runId as Id,
        {
          start: (page - 1) * PUBLISH_ITEMS_PAGE,
          end: page * PUBLISH_ITEMS_PAGE,
          sort: [sort.field],
          order: [sort.order],
          q: q.trim() || undefined,
          filters,
        },
        { signal },
      ),
    placeholderData: keepPreviousData,
    enabled: enabled && runId !== null,
  });
  return { rows: query.data?.data ?? [], total: query.data?.total, query };
}
