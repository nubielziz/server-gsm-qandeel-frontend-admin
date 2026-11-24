// One account for the record page, read through Refine so every action's invalidation refreshes it. Ports `mer(id)` of 42-p-merchants.js
// and the `cus(id)` lookup of pageCustomer (48-p-customers.js); a 404 becomes the "not found" state.
import { useOne } from '@refinedev/core';
import { isApiError } from '@/lib/api';
import type { AccountDetail } from '../types';

/**
 * `account` is the record once it has loaded, else undefined. It is also undefined while the page moves from one account to
 * another (Refine keeps the previous answer on screen until the next one arrives), so the wrong person never shows under another id.
 * `notFound` is true when the server answered 404. `id` is undefined when the address holds no usable id; the read is then skipped.
 */
export function useAccount(id: number | undefined) {
  const { result, query } = useOne<AccountDetail>({
    resource: 'clients',
    id: id ?? 0,
    queryOptions: { enabled: id !== undefined },
    // The page shows its own error state with Retry, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  const account = id !== undefined && result?.id === id ? result : undefined;
  const notFound = query.isError && isApiError(query.error) && query.error.status === 404;
  return { account, notFound, query };
}
