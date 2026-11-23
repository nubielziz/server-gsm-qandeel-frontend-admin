// The page and the page size of the Group view, kept in the address (`?view=groups&page=2&size=25`), so a reload or a link opens the same
// page. A page change adds a history entry; the correction of a page past the end replaces the entry. Every address is written by `productsPath`.
import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { ServiceType } from '@/lib/serviceTypes';
import { parsePage } from '../lib/filters';
import { GROUPS_DEFAULT_SIZE, parseGroupsSize } from '../lib/groupList';
import { productsPath } from '../lib/productsPath';

/** `page` and `size` are what the address names (page 1 and the default size when it names none). */
export function useGroupsAddress(type: ServiceType) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const page = parsePage(params);
  const size = parseGroupsSize(params.get('size'));

  const open = useCallback(
    (next: { page: number; size: number }, replace = false) => {
      const link = {
        view: 'groups',
        type,
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
    /** Goes to a page and keeps the size. */
    setPage: useCallback((next: number) => open({ page: next, size }), [open, size]),
    /** A new size starts again at the first page. */
    setSize: useCallback((next: number) => open({ page: 1, size: next }), [open]),
    /** Moves a page past the end back without a history entry. */
    clampPage: useCallback((next: number) => open({ page: next, size }, true), [open, size]),
  };
}
