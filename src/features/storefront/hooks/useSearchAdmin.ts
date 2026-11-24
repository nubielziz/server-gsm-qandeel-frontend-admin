// The read of the Search tab: the index status, refreshed while a rebuild runs.
import { getSearchIndex } from '../api';
import { useApiQuery } from '@/lib/query';
import { REBUILD_POLL_MS, SEARCH_INDEX_KEY } from './keys';

/** The index status. While a rebuild runs it is read every few seconds, so the page shows when the rebuild is done. */
export function useSearchIndex(enabled = true) {
  return useApiQuery({
    queryKey: [...SEARCH_INDEX_KEY],
    queryFn: ({ signal }) => getSearchIndex({ signal }),
    enabled,
    refetchInterval: (query) => (query.state.data?.rebuild.running ? REBUILD_POLL_MS : false),
  });
}
