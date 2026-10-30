// Small helpers every Finance tab uses to keep its page, sort and filters in the address (`?tab=ledger&page=2`), the way
// the orders page does (MISMATCHES M22). Nothing here decides what a filter means; it only reads and writes the question.
import type { SortState } from '@/components/ui';

/** Rows per page of the Finance lists. */
export const PAGE_SIZE = 25;

/** Digits only, else empty: an id or page from the address that is not a number is dropped. */
export function digits(value: string | null): string {
  return value && /^\d+$/.test(value) ? value : '';
}

/** The page in the address; anything unusable is page 1. */
export function parsePage(params: URLSearchParams): number {
  const page = Number(digits(params.get('page')));
  return page >= 1 ? page : 1;
}

/** The id of the record whose drawer or dialog is open (`?journal=25`), or null. */
export function parseOpenId(params: URLSearchParams, key: string): number | null {
  const raw = digits(params.get(key));
  return raw ? Number(raw) : null;
}

/** A copy of the address with these parameters set; an empty or missing value removes the parameter. */
export function withParams(
  base: URLSearchParams,
  patch: Readonly<Record<string, string | number | undefined>>,
): URLSearchParams {
  const next = new URLSearchParams(base);
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === '') next.delete(key);
    else next.set(key, String(value));
  }
  return next;
}

/** The sort in the address when its field is one the server can sort by; else the list's default. */
export function parseSort(
  params: URLSearchParams,
  fields: readonly string[],
  fallback: SortState,
): SortState {
  const field = fields.find((candidate) => candidate === params.get('sort'));
  if (!field) return fallback;
  return { field, order: params.get('dir') === 'asc' ? 'asc' : 'desc' };
}

/** The address with a sort; the list's default sort leaves no trace, so a clean address means the default. */
export function writeSort(base: URLSearchParams, sort: SortState, fallback: SortState): URLSearchParams {
  const isDefault = sort.field === fallback.field && sort.order === fallback.order;
  return withParams(base, {
    sort: isDefault ? undefined : sort.field,
    dir: isDefault ? undefined : sort.order,
  });
}

/** The page written into the address; page 1 leaves no trace. */
export function writePage(base: URLSearchParams, page: number): URLSearchParams {
  return withParams(base, { page: page > 1 ? page : undefined });
}
