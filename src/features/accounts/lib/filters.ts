// The filters of the accounts list and of the data-requests list as the two shapes the console sends them in: Refine's list filters (the
// data provider turns them into the query string) and a plain `ListQuery` (for the calls that do not go through Refine, such as the
// counts). Plain mapping only; the page reads and writes its own address.
import type { CrudFilters } from '@refinedev/core';
import type { FilterValue, ListQuery } from '@/lib/api';
import type { AccountListFilters, DataRequestFilters } from '../types';

type FilterMap = Record<string, FilterValue | readonly FilterValue[] | undefined>;

/** The same filters as Refine's list filters. `q` stays the free-text search; an array repeats the key (`in`). */
export function toRefineFilters(list: AccountListFilters | DataRequestFilters): CrudFilters {
  const out: CrudFilters = [];
  for (const [field, value] of Object.entries(list as FilterMap)) {
    if (value === undefined || (Array.isArray(value) && value.length === 0)) continue;
    if (field === 'q') out.push({ field, operator: 'eq', value });
    else out.push({ field, operator: Array.isArray(value) ? 'in' : 'eq', value });
  }
  return out;
}

/** The same filters as a `ListQuery`, for the calls that do not go through Refine. */
export function toListQuery(
  list: AccountListFilters | DataRequestFilters,
  extra: Omit<ListQuery, 'filters' | 'q'> = {},
): ListQuery {
  const { q, ...rest } = list as AccountListFilters;
  return { ...extra, ...(q ? { q } : {}), filters: rest as NonNullable<ListQuery['filters']> };
}
