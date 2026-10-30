// One service with its custom fields, option lists and group prices, for the dialogs that edit those parts. The record is read
// when a dialog opens and refreshed after a save (the part mutations invalidate it).
import { useOne } from '@refinedev/core';
import type { ServiceDetail } from '../types';

/** `detail` is undefined until the read answers; `query` carries loading, error and refetch. */
export function useServiceDetail(id: number) {
  const { result, query } = useOne<ServiceDetail>({
    resource: 'services',
    id,
    // The dialog shows its own error state, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { detail: result, query };
}
