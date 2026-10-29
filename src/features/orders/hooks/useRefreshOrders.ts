// Marks everything an order change touches as stale: the lists, the changed orders, their timelines, the counts and the ledger
// entries. The single-order actions do this through `staleOrders`; the bulk runner calls it once when it is done.
import { useInvalidate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { ORDER_STALE_KEYS } from './keys';

/** Returns a function that refreshes the lists and each of `ids` (a bulk run may have changed any of them). */
export function useRefreshOrders(): (ids: readonly number[]) => Promise<void> {
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();
  return useCallback(
    async (ids) => {
      await Promise.all([
        invalidate({ resource: 'orders', invalidates: ['list', 'many'] }),
        ...ids.map((id) => invalidate({ resource: 'orders', id, invalidates: ['detail'] })),
        ...ORDER_STALE_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ]);
    },
    [invalidate, queryClient],
  );
}
