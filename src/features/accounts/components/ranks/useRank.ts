// One rank for the Edit rank view, read through Refine so a save's invalidation (`useUpdateRank`) refreshes it. The ranks route is
// `GET /admin/client-groups/:id`.
import { useOne } from '@refinedev/core';
import { isApiError } from '@/lib/api';
import type { Rank } from '../../types';

/**
 * `rank` is the record once it has loaded, else undefined: also while the view moves from one rank to another (Refine keeps the previous
 * answer on screen until the next one arrives), so one rank is never shown under another id. `notFound` is true when the server answered 404.
 */
export function useRank(id: number) {
  const { result, query } = useOne<Rank>({
    resource: 'client-groups',
    id,
    // The view shows its own error state with Retry, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  const rank = result?.id === id ? result : undefined;
  const notFound = query.isError && isApiError(query.error) && query.error.status === 404;
  return { rank, notFound, query };
}
