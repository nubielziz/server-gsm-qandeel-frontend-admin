// Saving the order of services (`POST /admin/services/order`): the positions typed in the grid's Order boxes, all or none. Merchants and API
// clients read the services of a category in this order. The grid shows the server's refusal under the box it names.
import { useApiMutation } from '@/lib/query';
import { orderServices } from '../api';
import type { ServiceOrderBody } from '../types';
import { SERVICE_STALE_KEYS } from './keys';

/**
 * Stores the positions. Side effects: `POST /admin/services/order`, the toast (how many services changed position) and the refresh of the
 * services reads. A refusal is left to the view, which puts each message under its box.
 */
export function useSaveServiceOrder() {
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
    errorNotification: () => false,
  });
}
