// One supplier's detail: the hourly history and the linked services, which the list rows do not carry. The page draws the
// header and the stats from the list row at once and the charts and the services table when this arrives.
import { useOne } from '@refinedev/core';
import type { Id } from '@/lib/api';
import type { SupplierDetail } from '../types';
import { REFRESH_MS } from './keys';

/** `detail` is undefined until the read arrives (and for a supplier the staff member switched to); `query` carries the state. */
export function useSupplierDetail(id: Id | undefined) {
  const { result, query } = useOne<SupplierDetail>({
    resource: 'suppliers',
    id,
    queryOptions: { enabled: id !== undefined, refetchInterval: REFRESH_MS },
    errorNotification: false,
  });
  return { detail: result, query };
}
