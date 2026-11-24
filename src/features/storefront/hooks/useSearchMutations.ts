// The action of the Search tab: the index rebuild. It toasts the way the other storefront actions do and makes the index status
// stale. The confirm dialog shows a refusal, so the default error toast is off.
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui';
import { useApiMutation } from '@/lib/query';
import { rebuildSearchIndex } from '../api';
import { SEARCH_INDEX_KEY, SEARCH_INDEX_STALE_KEYS } from './keys';

const NO_ERROR_TOAST = () => false as const;

/**
 * Starts the rebuild. The confirm dialog shows a refusal. After a refusal because a rebuild already runs the status is read
 * again, so the page shows the run that is going.
 */
export function useRebuildIndex() {
  const queryClient = useQueryClient();
  return useApiMutation({
    mutationFn: () => rebuildSearchIndex(),
    invalidateKeys: SEARCH_INDEX_STALE_KEYS,
    onSuccess: () => {
      toast({
        kind: 'success',
        title: 'Rebuild started',
        body: 'Search keeps working while the new index is built.',
        ttl: 3200,
      });
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: [...SEARCH_INDEX_KEY] });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}
