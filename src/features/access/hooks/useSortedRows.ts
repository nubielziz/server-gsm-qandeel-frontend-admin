// Keeps the sort of a small table in the page and applies it to rows that are already loaded whole.
import { useMemo, useState } from 'react';
import type { SortState } from '@/components/ui';
import { sortRows, type SortValues } from '../lib/sort';

/** Pass a `values` object that lives outside the component, so the sorted rows are only recomputed when something changes. */
export function useSortedRows<T>(rows: readonly T[], values: SortValues<T>, initial: SortState) {
  const [sort, setSort] = useState<SortState>(initial);
  const sorted = useMemo(() => sortRows(rows, sort, values), [rows, sort, values]);
  return { rows: sorted, sort, setSort };
}
