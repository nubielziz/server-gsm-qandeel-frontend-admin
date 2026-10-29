// One order and its timeline for the drawer. The list row shows at once; the single-order read replaces it with the
// fresher answer and is refreshed after every action (the action hooks invalidate it).
import { useOne } from '@refinedev/core';
import { useApiQuery } from '@/lib/query';
import { listOrderEvents } from '../api';
import type { Order } from '../types';
import { ORDER_EVENTS_KEY } from './keys';

/** `row` is the list row when the drawer opens from the table; a deep link has none, so `order` is undefined until the read answers. */
export function useOrder(id: number, row?: Order) {
  const { result, query } = useOne<Order>({
    resource: 'orders',
    id,
    queryOptions: { placeholderData: row ? { data: row } : undefined },
    // The drawer shows its own error state, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { order: result ?? row, query };
}

/** The timeline of the order, newest events included after every action. */
export function useOrderEvents(id: number) {
  return useApiQuery({
    queryKey: [...ORDER_EVENTS_KEY, id],
    queryFn: ({ signal }) => listOrderEvents(id, { signal }),
  });
}
