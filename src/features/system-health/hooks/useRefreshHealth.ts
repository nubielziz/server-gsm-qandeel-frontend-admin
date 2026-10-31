// The Refresh button of the System health header: read every health card again at once.
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { HEALTH_KEY } from './keys';

/**
 * Returns a function that refetches every health read that is on screen (a mounted, enabled query) and resolves when
 * all of them have finished. It never rejects: a read that fails shows its own error in its card. The button uses the
 * promise for its busy state.
 */
export function useRefreshHealth(): () => Promise<void> {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.refetchQueries({ queryKey: HEALTH_KEY, type: 'active' }),
    [queryClient],
  );
}
