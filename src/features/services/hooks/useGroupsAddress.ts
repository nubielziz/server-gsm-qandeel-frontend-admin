// The page, the page size and the search of the Group view, kept in the address (`?view=groups&q=app&page=2&size=25`), so a reload or a link
// opens the same page. A page change adds a history entry; a search, a correction of a page past the end and the landing on a group just
// added replace the entry. `group=<id>` is what Add Group leaves for the view to show the new group. Every address is written by `productsPath`.
import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { ServiceType } from '@/lib/serviceTypes';
import { parsePage } from '../lib/filters';
import { GROUPS_DEFAULT_SIZE, parseGroupsSize } from '../lib/groupList';
import { parseRecordId, productsPath } from '../lib/productsPath';

/** `page`, `size` and `q` are what the address names (page 1, the default size and no search when it names none). */
export function useGroupsAddress(type: ServiceType) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const page = parsePage(params);
  const size = parseGroupsSize(params.get('size'));
  const q = (params.get('q') ?? '').trim();
  const added = parseRecordId(params.get('group'));

  // Every move writes the whole address from these three keys, so `group` (a one-time hand-off) is gone after it.
  const open = useCallback(
    (next: { page: number; size: number; q: string }, replace = false) => {
      const link = {
        view: 'groups',
        type,
        q: next.q,
        page: next.page,
        // The default size is left out of the address, as the first page is.
        size: next.size === GROUPS_DEFAULT_SIZE ? undefined : next.size,
      } as const;
      void navigate(productsPath(link), { replace });
    },
    [navigate, type],
  );

  return {
    page,
    size,
    q,
    /** The group Add Group just made (`group=<id>`), or null. */
    added,
    /** Goes to a page and keeps the size and the search. */
    setPage: useCallback((next: number) => open({ page: next, size, q }), [open, size, q]),
    /** A new size starts again at the first page. */
    setSize: useCallback((next: number) => open({ page: 1, size: next, q }), [open, q]),
    /** A new search starts again at the first page; an empty text clears it. */
    search: useCallback((text: string) => open({ page: 1, size, q: text.trim() }, true), [open, size]),
    /** Moves a page past the end back without a history entry. */
    clampPage: useCallback((next: number) => open({ page: next, size, q }, true), [open, size, q]),
    /** Opens a page with a search (or none) without a history entry; it also drops `group`. */
    land: useCallback((next: { page: number; q: string }) => open({ ...next, size }, true), [open, size]),
  };
}
