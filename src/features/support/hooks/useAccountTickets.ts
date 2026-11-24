// One account's tickets, newest activity first, for the list the account's record embeds (`AccountTickets`). It uses the same
// list route as the inbox, filtered to this account: the server takes the account id alone (`requesterId`).
import { useList } from '@refinedev/core';
import { toRefineFilters } from '../lib/filters';
import type { SupportTicket } from '../types';

/** Tickets the embedded list shows; the link to the inbox has the rest. */
export const ACCOUNT_TICKET_LIMIT = 10;

export function useAccountTickets(accountId: number, enabled = true) {
  const { result, query } = useList<SupportTicket>({
    resource: 'support-tickets',
    pagination: { currentPage: 1, pageSize: ACCOUNT_TICKET_LIMIT },
    sorters: [{ field: 'updatedAt', order: 'desc' }],
    filters: toRefineFilters({ requesterId: accountId }),
    queryOptions: { enabled },
    errorNotification: false,
  });
  return { tickets: result.data, total: result.total, query };
}
