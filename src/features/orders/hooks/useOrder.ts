// One order and its timeline for the drawer. The list row shows at once; the single-order read replaces it with the
// fresher answer and is refreshed after every action (the action hooks invalidate it).
import { useOne } from '@refinedev/core';
import { useApiQuery } from '@/lib/query';
import { listOrderEvents } from '../api';
import type { Order, OrderAnswer, OrderDetail } from '../types';
import { ORDER_EVENTS_KEY } from './keys';

/**
 * `row` is the list row when the drawer opens from the table; a deep link has none, so `order` is undefined until the read answers.
 * `answers` are the buyer's answers to the service's custom fields: only the single-order read carries them, so they are empty until
 * that read has arrived (the list row stands in for the order meanwhile).
 */
export function useOrder(id: number, row?: Order) {
  const { result, query } = useOne<OrderDetail>({
    resource: 'orders',
    id,
    queryOptions: { placeholderData: row ? { data: { ...row, answers: [] } } : undefined },
    // The drawer shows its own error state, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  const answers: OrderAnswer[] = result?.answers ?? [];
  return { order: result ?? row, answers, query };
}

/** The timeline of the order, newest events included after every action. */
export function useOrderEvents(id: number) {
  return useApiQuery({
    queryKey: [...ORDER_EVENTS_KEY, id],
    queryFn: ({ signal }) => listOrderEvents(id, { signal }),
  });
}
