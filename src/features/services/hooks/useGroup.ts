// One group (service category) for the Edit Group view. The record is read when the view opens and read again after a save (the category
// mutations invalidate it).
import { useOne } from '@refinedev/core';
import type { ServiceCategory } from '../types';

/** `group` is undefined until the read answers; `query` carries loading, error and refetch. */
export function useGroup(id: number) {
  const { result, query } = useOne<ServiceCategory>({
    resource: 'service-categories',
    id,
    // The view shows its own error state, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { group: result, query };
}
