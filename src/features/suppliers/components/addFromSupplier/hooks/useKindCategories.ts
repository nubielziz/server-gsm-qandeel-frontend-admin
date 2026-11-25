// The groups (categories) of the console that have the page's kind, for the menu "Service Listed In Group" of the single-services path.
// The list is read whole (a console has few) and narrowed here, because the route has no filter for the kind.
import { listCategories } from '@/features/services';
import { useApiQuery } from '@/lib/query';
import type { ServiceType } from '@/lib/serviceTypes';

/** The newest read of the groups, kept under the suppliers' own keys (one entry for each kind). */
export const KIND_CATEGORIES_KEY = ['api', 'suppliers', 'kind-categories'] as const;

/**
 * The most groups one read takes: the server's largest page (1000). Production has more than 200 groups, and a new group goes last,
 * so a smaller read left the newest groups out of this menu.
 */
export const CATEGORY_ROWS = 1000;

/** How long a read of the groups counts as fresh. */
const FRESH_MS = 30_000;

/**
 * The groups of this kind, in their order. Needs `catalog:read`: pass `enabled: false` for a role without it (the menu then offers only
 * "Same as at the supplier"). `data` is the list narrowed to the kind.
 */
export function useKindCategories(type: ServiceType, enabled: boolean) {
  return useApiQuery({
    queryKey: [...KIND_CATEGORIES_KEY, type],
    queryFn: ({ signal }) =>
      listCategories({ start: 0, end: CATEGORY_ROWS, sort: ['sort'], order: ['asc'] }, { signal }),
    select: (result) => result.data.filter((category) => category.type === type),
    enabled,
    staleTime: FRESH_MS,
  });
}
