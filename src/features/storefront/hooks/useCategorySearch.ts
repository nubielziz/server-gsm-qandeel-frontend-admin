// The server search behind the category field of the retail pricing rule dialog: the categories whose name holds the typed text
// (`GET /admin/service-categories?q=`, the services feature's `listCategories`, needs `catalog:read`). A menu of every category
// would stop at 200 without a word, and a supplier's Quick add makes one category for each of its groups.
import { useEffect, useState } from 'react';
import { listCategories } from '@/features/services';
import { useApiQuery } from '@/lib/query';
import { CATEGORY_SEARCH_ROWS, categorySearchKey, PICKER_STALE_MS, SERVICE_SEARCH_PAUSE_MS } from './keys';

/** `value`, once it has stayed the same for `delay` ms. */
export function useSettledValue<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

/**
 * Searches the categories for `text`, after a short pause in the typing; an empty text asks for the first ones by name. Each text
 * has its own cache entry, so an answer to an older text never replaces a newer one. `settling` is true while the typed text has
 * not been sent yet. `enabled: false` sends nothing.
 */
export function useCategorySearch(text: string, enabled: boolean) {
  const typed = text.trim();
  const q = useSettledValue(typed, SERVICE_SEARCH_PAUSE_MS);
  const query = useApiQuery({
    queryKey: categorySearchKey(q),
    queryFn: ({ signal }) =>
      listCategories(
        { start: 0, end: CATEGORY_SEARCH_ROWS, sort: ['name'], order: ['asc'], q: q || undefined },
        { signal },
      ),
    enabled,
    staleTime: PICKER_STALE_MS,
    retry: false,
  });
  return { query, settling: typed !== q };
}
