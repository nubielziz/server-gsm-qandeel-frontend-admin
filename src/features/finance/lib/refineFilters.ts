// Turns a tab's list filters into the filters Refine's list hooks take; the data provider writes them back into the query
// string (`purpose=topup&status=pending&q=…`). Shared by the Ledger, Deposits and Invoices tabs.
import type { CrudFilters } from '@refinedev/core';
import type { FilterValue } from '@/lib/api';

/** Field filters of a list call. An undefined value means "no filter on that field". */
export type ListFilters = Record<string, FilterValue | undefined>;

/** `q` is the free text the server searches; every other field is an equality filter. */
export function toRefineFilters(filters: ListFilters): CrudFilters {
  const out: CrudFilters = [];
  for (const [field, value] of Object.entries(filters)) {
    if (value === undefined || value === '') continue;
    out.push({ field, operator: 'eq', value });
  }
  return out;
}
