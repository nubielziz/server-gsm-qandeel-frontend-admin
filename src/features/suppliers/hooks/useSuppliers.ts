// The suppliers as a Refine list. A company has a handful, so the page loads them all and draws the list, the header counts
// and the target menus from it.
import { useList } from '@refinedev/core';
import type { Supplier } from '../types';
import { REFRESH_MS } from './keys';

/** Most suppliers one load takes; the list on the left has no pager. */
export const SUPPLIER_LIMIT = 200;

/** Where the list is for a menu built from it: still being read, could not be read, or read (or never asked for). */
export type SuppliersStatus = 'loading' | 'error' | 'ready';

/**
 * `suppliers` are the loaded rows, `total` what the server counted; `query` carries loading, error and refetch. The list
 * asks again every 30 seconds so health and balances stay current without a reload. `status` is for a menu that must not
 * call an unread list "empty": a failed refresh behind rows already on screen is still `ready`, and a list that was not
 * asked for (`enabled: false`) is `ready` too (the menu says why it is off). `retry` reads the list again.
 */
export function useSuppliers(options: { enabled?: boolean } = {}) {
  const { result, query } = useList<Supplier>({
    resource: 'suppliers',
    pagination: { currentPage: 1, pageSize: SUPPLIER_LIMIT },
    queryOptions: { enabled: options.enabled ?? true, refetchInterval: REFRESH_MS },
    // The page shows its own error state with Retry, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  const status: SuppliersStatus = query.isLoading
    ? 'loading'
    : query.isError && result.data.length === 0
      ? 'error'
      : 'ready';
  return { suppliers: result.data, total: result.total, query, status, retry: () => void query.refetch() };
}
