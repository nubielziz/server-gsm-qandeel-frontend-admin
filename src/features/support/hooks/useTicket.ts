// One ticket with its thread, and the order it is about. The thread is read by id (not taken from the list), so a link to a
// ticket works whatever the filters say, and it is read again after every reply so the new message shows.
import { useOne } from '@refinedev/core';
import type { Order } from '@/features/orders';
import type { SupportTicketDetail } from '../types';
import { REFRESH_MS } from './keys';

/** `ticket` is the thread once it has loaded; `query` carries loading, error (a 404 for an unknown id) and refetch. */
export function useTicket(id: number | null) {
  const { result, query } = useOne<SupportTicketDetail>({
    resource: 'support-tickets',
    id: id ?? 0,
    queryOptions: { enabled: id !== null, refetchInterval: REFRESH_MS },
    // The pane shows its own error state with Retry, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { ticket: id === null ? undefined : result, query };
}

/**
 * The order a ticket is about, for the order line, the macro variables and the Refund buttons. A staff member without
 * `orders:read` gets an error here; the thread then shows the order number only and the macros use their plain wording.
 */
export function useTicketOrder(orderId: number | null) {
  const { result, query } = useOne<Order>({
    resource: 'orders',
    id: orderId ?? 0,
    queryOptions: { enabled: orderId !== null, retry: false },
    errorNotification: false,
  });
  return { order: orderId === null ? undefined : result, query };
}
