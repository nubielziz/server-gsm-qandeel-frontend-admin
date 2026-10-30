// The figures above the tables and on the first tab. Each is a list call with `_start=0&_end=1`, read from `x-total-count`, so the
// server counts and filters. The demo counted its in-memory array (`on.length`, `pub.length`); sums over every row are not
// available from a paged list (MISMATCHES M107 has the same limit).
import { useQueries } from '@tanstack/react-query';
import type { ApiInit, ListQuery, ListResult } from '@/lib/api';
import { STOREFRONT_COUNTS_KEY } from './keys';

/** One figure: a name and the filters whose total it is. */
export type CountSpec = { id: string; filters?: NonNullable<ListQuery['filters']> };

/**
 * The totals of some filtered lists, by spec id. A figure is undefined until the server has answered. `scope` keeps the
 * figures of one list apart in the cache; `enabled` is false until the staff member's permissions are known.
 */
export function useCounts(
  scope: string,
  list: (query: ListQuery, init?: ApiInit) => Promise<ListResult<unknown>>,
  specs: readonly CountSpec[],
  enabled = true,
): Record<string, number | undefined> {
  const results = useQueries({
    queries: specs.map((spec) => ({
      queryKey: [...STOREFRONT_COUNTS_KEY, scope, spec.id],
      queryFn: async ({ signal }: { signal: AbortSignal }) =>
        (await list({ start: 0, end: 1, filters: spec.filters }, { signal })).total,
      enabled,
    })),
  });
  return Object.fromEntries(specs.map((spec, index) => [spec.id, results[index]?.data]));
}
