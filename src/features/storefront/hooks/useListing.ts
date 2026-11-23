// The editor's read: one listing with its two Markdown bodies (`GET /admin/service-listings/:id`; the list leaves them out).
// It is read every time the editor opens and dropped when it closes (`gcTime: 0`), so the form never starts from a cached copy
// that another save has made old.
import type { Id } from '@/lib/api';
import { useApiQuery } from '@/lib/query';
import { getListing } from '../api';
import { listingDetailKey } from './keys';

// The start of every key `listingDetailKey` builds. It lives in the shared keys (the services side invalidates it too, when a price
// moves); it is exported from here as well, so the storefront's own imports keep working.
export { LISTING_DETAILS_KEY } from '@/lib/query';

/**
 * The listing with its bodies; `query` carries loading, error and refetch. A service without a listing, or a role that may not read
 * shop facts, gives no id: the read then stays off. A new id is a new key, so the form of the listing before it is never shown for
 * this one (`gcTime: 0` drops the old copy at once, and there is no placeholder data). The copy is kept for good
 * (`staleTime: Infinity`) and made stale only by a write: every listing write, every decided price proposal and every price
 * change on the services side invalidates {@link LISTING_DETAILS_KEY}.
 */
export function useListing(id: Id | null | undefined) {
  return useApiQuery({
    queryKey: [...listingDetailKey(id ?? 0)],
    queryFn: ({ signal }) => {
      if (id == null) throw new Error('There is no listing to read.');
      return getListing(id, { signal });
    },
    enabled: id != null,
    gcTime: 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
