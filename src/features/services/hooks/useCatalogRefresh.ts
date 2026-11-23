// What a change made from the Catalog table makes stale: the table's rows and counts (the shared rows key), the services' own records,
// the shop listings, the category counts and the reads behind them (menus, resolutions, dashboard). One function, so the switches and
// the bulk actions refresh the same way and once.
import { useInvalidate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { SERVICE_STALE_KEYS } from './keys';

/** Returns `refresh()`, stable across renders, which marks every read a Catalog row action can change as stale. */
export function useCatalogRefresh() {
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await Promise.all([
      ...SERVICE_STALE_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      invalidate({ resource: 'services', invalidates: ['list', 'many', 'detail'] }),
      invalidate({ resource: 'service-listings', invalidates: ['list', 'many', 'detail'] }),
      invalidate({ resource: 'service-categories', invalidates: ['list'] }),
    ]);
  }, [invalidate, queryClient]);
}
