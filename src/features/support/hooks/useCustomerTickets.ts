// One customer's tickets, newest activity first, for the list the customer page embeds (`CustomerTickets`). It uses the same
// list route as the inbox, filtered to this customer.
import { useList } from '@refinedev/core';
import { toRefineFilters } from '../lib/filters';
import type { SupportTicket } from '../types';

/** Tickets the embedded list shows; the link to the inbox has the rest. */
export const CUSTOMER_TICKET_LIMIT = 10;

export function useCustomerTickets(customerId: number, enabled = true) {
  const { result, query } = useList<SupportTicket>({
    resource: 'support-tickets',
    pagination: { currentPage: 1, pageSize: CUSTOMER_TICKET_LIMIT },
    sorters: [{ field: 'updatedAt', order: 'desc' }],
    filters: toRefineFilters({ requesterType: 'customer', requesterId: customerId }),
    queryOptions: { enabled },
    errorNotification: false,
  });
  return { tickets: result.data, total: result.total, query };
}
