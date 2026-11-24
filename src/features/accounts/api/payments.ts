// One account's payments: the finance feature's list (`GET /admin/payments`) filtered by the buyer's account. The finance feature
// owns the route and its `@route` tag; this function only fixes the filter, so no coverage is claimed twice. The filter is `accountId`:
// `customerId` answers 422 on the server, and `clientId` is only an alias of `accountId`.
import { apiList, type ApiInit, type Id, type ListQuery, type ListResult } from '@/lib/api';
import type { Payment } from '@/features/finance';

/**
 * The payments of one account (top-ups and the like), one page of them, with the total in `x-total-count`. Needs `payments:read`.
 * Sort with `_sort=createdAt&_order=desc` for newest first.
 */
export function listAccountPayments(
  accountId: Id,
  query: ListQuery = {},
  init?: ApiInit,
): Promise<ListResult<Payment>> {
  return apiList<Payment>(
    '/admin/payments',
    { ...query, filters: { ...query.filters, accountId } },
    undefined,
    init,
  );
}
