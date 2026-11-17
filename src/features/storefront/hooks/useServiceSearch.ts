// The server search behind the Add listing dialog's Service field: the active IMEI services whose name, code or category holds the
// typed text (`GET /admin/services?q=`, the services feature's own `listServices`, needs `catalog:read`). It replaces a menu capped at
// 200 names, which hid most services after a supplier's Quick add.
import { useEffect, useState } from 'react';
import { listServices } from '@/features/services';
import { useApiQuery } from '@/lib/query';
import { PICKER_STALE_MS, SERVICE_SEARCH_PAUSE_MS, SERVICE_SEARCH_ROWS, serviceSearchKey } from './keys';

/** `value`, once it has stayed the same for `delay` ms. */
function useSettledValue<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

/**
 * Searches the services that may be listed for `text`, after a short pause in the typing; an empty text asks for the first
 * services by name, so a staff member who does not know the name can browse. Each text has its own cache entry, so an answer
 * to an older text never replaces a newer one, and React Query aborts the older request when the text moves on.
 * `settling` is true while the typed text has not been sent yet. `enabled: false` (the list is closed) sends nothing.
 */
export function useServiceSearch(text: string, enabled: boolean) {
  const typed = text.trim();
  const q = useSettledValue(typed, SERVICE_SEARCH_PAUSE_MS);
  const query = useApiQuery({
    queryKey: serviceSearchKey(q),
    // The same rule as the menu it replaces: active IMEI services only. A service that already has a listing is still
    // offered; the server refuses it under the field ("This service already has a listing.").
    queryFn: ({ signal }) =>
      listServices(
        {
          start: 0,
          end: SERVICE_SEARCH_ROWS,
          sort: ['name'],
          order: ['asc'],
          q: q || undefined,
          filters: { type: 'imei', status: 'active' },
        },
        { signal },
      ),
    enabled,
    staleTime: PICKER_STALE_MS,
    // A failed search shows its error with a Retry button at once instead of waiting for a silent second try.
    retry: false,
  });
  return { query, q, settling: typed !== q };
}
