// One account's payments for the Payments part, a page at a time with the size the footer pager chose. It asks through the data layer's API
// function under the data layer's key (finance makes that key stale after it approves a top-up).
import { keepPreviousData } from '@tanstack/react-query';
import { useApiQuery } from '@/lib/query';
import { listAccountPayments } from '../../api';
import { PAYMENTS_KEY } from '../../hooks/keys';

/** What the read needs: the account, the 1-based page and its size. */
export type PaymentsArgs = { accountId: number; page: number; pageSize: number };

/**
 * One page of the account's payments, newest first, with the total in `data.total`. The filter is `accountId` (never `customerId`).
 *
 * @param args the account, the page and its size.
 * @see GET /admin/payments
 */
export function useAccountPaymentList({ accountId, page, pageSize }: PaymentsArgs) {
  return useApiQuery({
    queryKey: [...PAYMENTS_KEY, accountId, 'list', page, pageSize],
    queryFn: ({ signal }) =>
      listAccountPayments(
        accountId,
        { start: (page - 1) * pageSize, end: page * pageSize, sort: ['createdAt'], order: ['desc'] },
        { signal },
      ),
    placeholderData: keepPreviousData,
  });
}
