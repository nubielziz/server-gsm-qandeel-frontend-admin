// One account's invoices for the Invoices part: the finance feature's list filtered by `accountId`, newest first, a page at a time. The finance
// feature owns the route; the query sits under the accounts keys (`['api', 'accounts', ...]`) with the other reads of the record.
import { keepPreviousData } from '@tanstack/react-query';
import { listInvoices } from '@/features/finance';
import { useApiQuery } from '@/lib/query';

/** The invoices of each account (every page and size). */
export const INVOICES_KEY = ['api', 'accounts', 'invoices'] as const;

/** What the read needs: the account, the 1-based page and its size. */
export type InvoicesArgs = { accountId: number; page: number; pageSize: number };

/**
 * One page of the account's invoices, newest first, with the total in `data.total`. The previous page stays on screen while the next one loads.
 *
 * @param args the account, the page and its size.
 * @see GET /admin/invoices
 */
export function useAccountInvoices({ accountId, page, pageSize }: InvoicesArgs) {
  return useApiQuery({
    queryKey: [...INVOICES_KEY, accountId, page, pageSize],
    queryFn: ({ signal }) =>
      listInvoices(
        {
          start: (page - 1) * pageSize,
          end: page * pageSize,
          sort: ['createdAt'],
          order: ['desc'],
          filters: { accountId },
        },
        { signal },
      ),
    placeholderData: keepPreviousData,
  });
}
