// What a change made from a service row makes stale: the lists' rows and counts (the shared rows key), the services' own records,
// the shop listings, the category counts and the reads behind them (menus, resolutions, dashboard). One function, so the switches and
// the bulk actions refresh the same way and once.
import { useInvalidate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { SERVICE_STALE_KEYS, staleServices } from './keys';

/**
 * Returns `refresh(ids)`, stable across renders, which marks every read a service row action can change as stale. `ids` are the
 * services the action changed: each one's own record is made stale too, because Refine's `detail` read of a record is keyed by its id and
 * a refresh without ids only reaches the key of id "" (so a service open in its edit view kept showing the old shop switch). It also
 * suits `useSequentialRun`, which hands the ids of the run to its refresh.
 */
export function useServicesRefresh() {
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();
  return useCallback(
    async (ids: readonly number[] = []) => {
      await Promise.all([
        ...SERVICE_STALE_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
        invalidate({ resource: 'services', invalidates: ['list', 'many', 'detail'] }),
        // Each changed service's own record (the one an open edit view holds), named the way the mutations name it.
        ...staleServices(...ids)
          .filter((target) => target.id !== undefined)
          .map((target) => invalidate({ resource: target.resource, id: target.id, invalidates: ['detail'] })),
        invalidate({ resource: 'service-listings', invalidates: ['list', 'many', 'detail'] }),
        invalidate({ resource: 'service-categories', invalidates: ['list'] }),
      ]);
    },
    [invalidate, queryClient],
  );
}
