// Client-side sorting for the small lists of this page (admins, IP rules). The demo's table() sorted in memory with a
// value function per column; the API lists here are loaded whole, so the console does the same and the table only
// reports which column the user picked.
import type { SortState } from '@/components/ui';

/** For each sortable column (its `sortField`), the value to compare. */
export type SortValues<T> = Record<string, (row: T) => string | number>;

/**
 * The rows ordered by the picked column. Equal values keep their order. With no sort, or a column that has no
 * value function, the rows come back unchanged.
 */
export function sortRows<T>(rows: readonly T[], sort: SortState | undefined, values: SortValues<T>): T[] {
  const pick = sort ? values[sort.field] : undefined;
  if (!sort || !pick) return [...rows];
  const direction = sort.order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = pick(a);
    const y = pick(b);
    return (x < y ? -1 : x > y ? 1 : 0) * direction;
  });
}

/** An ISO date as a sortable number; a missing date sorts first (0). */
export function timeValue(iso: string | null | undefined): number {
  const ms = iso ? Date.parse(iso) : 0;
  return Number.isNaN(ms) ? 0 : ms;
}
