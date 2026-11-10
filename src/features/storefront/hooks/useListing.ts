// The editor's read: one listing with its two Markdown bodies (`GET /admin/service-listings/:id`; the list leaves them out).
// It is read every time the editor opens and dropped when it closes (`gcTime: 0`), so the form never starts from a cached copy
// that another save has made old.
import { useApiQuery } from '@/lib/query';
import { getListing } from '../api';
import { listingDetailKey } from './keys';

/** The listing with its bodies; `query` carries loading, error and refetch. */
export function useListing(id: number) {
  return useApiQuery({
    queryKey: [...listingDetailKey(id)],
    queryFn: ({ signal }) => getListing(id, { signal }),
    gcTime: 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
