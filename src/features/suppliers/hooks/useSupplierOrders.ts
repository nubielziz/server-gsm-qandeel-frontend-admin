// The open orders of one supplier for the reroute dialog: the oldest first, because those have waited longest. It reads
// the orders list through the orders feature, so it needs `orders:read`.
import type { Id } from '@/lib/api';
import { useApiQuery } from '@/lib/query';
import { listOrders } from '@/features/orders';
import { SUPPLIER_ORDERS_KEY } from './keys';

/** Most orders one reroute moves; a longer queue is moved in several runs. */
export const REROUTE_LIMIT = 200;

/** `data.data` are the orders, `data.total` how many the server counted (more than the limit means the dialog says so). */
export function useSupplierOrders(supplierId: Id, enabled: boolean) {
  return useApiQuery({
    queryKey: [...SUPPLIER_ORDERS_KEY, supplierId],
    queryFn: ({ signal }) =>
      listOrders(
        {
          start: 0,
          end: REROUTE_LIMIT,
          sort: ['createdAt'],
          order: ['asc'],
          filters: { supplierId, status: ['pending', 'processing'] },
        },
        { signal },
      ),
    enabled,
    // The dialog reads the queue as it is now, not a copy from a few minutes ago.
    staleTime: 0,
    gcTime: 0,
  });
}
