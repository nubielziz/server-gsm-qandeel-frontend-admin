// Saving the order of services (`POST /admin/services/order`): the positions typed in the grid's Order boxes or the ones a drop of a row made, all
// or none. Merchants and API clients read the services of a category in this order. The grid shows the server's refusal of typed positions
// under the box it names; a refusal of a drop is a toast with the server's words.
import { useInvalidate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useApiMutation } from '@/lib/query';
import { orderServices } from '../api';
import { refusalWords } from '../lib/reorder';
import type { ServiceOrderBody } from '../types';
import { SERVICE_STALE_KEYS } from './keys';

/**
 * Stores the positions. Side effects: `POST /admin/services/order`, the toast (how many services changed position) and the refresh of the
 * services reads. A refusal is left to the view, which puts each message under its box.
 *
 * With `dropped` (a drop of a row, decision 042) it only sends: no toast for a save that worked (the row that stays where it was dropped
 * says so, and a toast per drop is noise), no read of its own (`useReorder` reads once after the last save of a run of drops, with
 * `useServiceOrderRefresh`), and a refusal is a toast with the server's words, since a drop has no box to show it under.
 */
export function useSaveServiceOrder({ dropped = false }: { dropped?: boolean } = {}) {
  return useApiMutation({
    mutationFn: (body: ServiceOrderBody) => orderServices(body),
    invalidates: dropped ? [] : [{ resource: 'services' }],
    invalidateKeys: dropped ? [] : SERVICE_STALE_KEYS,
    successNotification: (result) =>
      dropped
        ? false
        : {
            message: result.updated === 0 ? 'The order was already saved' : 'Order saved',
            description:
              result.updated === 0
                ? 'No service changed position.'
                : `${result.updated} ${result.updated === 1 ? 'service' : 'services'} changed position. Merchants see them in this order.`,
          },
    errorNotification: (error) =>
      dropped ? { message: error.title, description: refusalWords(error) } : false,
  });
}

/** Reads again what a new order of services makes stale: the services reads and the keys of `SERVICE_STALE_KEYS` (the grid among them). */
export function useServiceOrderRefresh() {
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await Promise.all([
      invalidate({ resource: 'services', invalidates: ['list', 'many', 'detail'] }),
      ...SERVICE_STALE_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    ]);
  }, [invalidate, queryClient]);
}
