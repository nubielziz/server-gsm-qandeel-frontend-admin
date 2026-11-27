// Saving the order of services (`POST /admin/services/order`): the positions typed in the grid's Order boxes or the ones a drop of a row made, all
// or none. Merchants and API clients read the services of a category in this order. The grid shows the server's refusal of typed positions
// under the box it names; a refusal of a drop is a toast with the server's words.
import { useApiMutation } from '@/lib/query';
import { orderServices } from '../api';
import { refusalWords } from '../lib/reorder';
import type { ServiceOrderBody } from '../types';
import { SERVICE_STALE_KEYS } from './keys';

/**
 * Stores the positions. Side effects: `POST /admin/services/order`, the toast (how many services changed position) and the refresh of the
 * services reads. A refusal is left to the view, which puts each message under its box; with `toastRefusals` (a drop of a row, which has no
 * box to show it under) it is a toast with the server's words instead.
 */
export function useSaveServiceOrder({ toastRefusals = false }: { toastRefusals?: boolean } = {}) {
  return useApiMutation({
    mutationFn: (body: ServiceOrderBody) => orderServices(body),
    invalidates: [{ resource: 'services' }],
    invalidateKeys: SERVICE_STALE_KEYS,
    successNotification: (result) => ({
      message: result.updated === 0 ? 'The order was already saved' : 'Order saved',
      description:
        result.updated === 0
          ? 'No service changed position.'
          : `${result.updated} ${result.updated === 1 ? 'service' : 'services'} changed position. Merchants see them in this order.`,
    }),
    errorNotification: (error) =>
      toastRefusals ? { message: error.title, description: refusalWords(error) } : false,
  });
}
