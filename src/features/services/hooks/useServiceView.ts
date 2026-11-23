// The Catalog table's chip, filters, page, sort and open service, kept in the address (`?chip=attention&q=…&page=2&open=12`), so a
// link or a reload shows the same list. Changes replace the history entry: Back should leave the page, not walk through every keystroke.
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { SortState } from '@/components/ui';
import type { Id } from '@/lib/api';
import type { PanelSectionId } from '../components/panel/types';
import {
  clearServiceFilters,
  parsePage,
  parseServiceFilters,
  parseSort,
  writeServiceFilters,
  writeView,
  type ServiceFilters,
} from '../lib/filters';

/**
 * The part of a service's side panel a link opens (`?section=`): one of the panel's section ids (`suppliers` is the supplier chain,
 * `prices` the merchant and shop prices, `shop` the shop page). The panel reads the address through `usePanelAddress`.
 */
export type PanelSection = PanelSectionId;

/** The table's state from the address, and the functions that change it. */
export function useServiceView() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseServiceFilters(params), [params]);
  const sort = useMemo(() => parseSort(params), [params]);
  const page = parsePage(params);

  /** Changes some filters (or the chip) and goes back to page 1. */
  const setFilters = useCallback(
    (patch: Partial<ServiceFilters>) =>
      setParams((prev) => writeView(writeServiceFilters(prev, patch), { page: 1 }), { replace: true }),
    [setParams],
  );
  const clearFilters = useCallback(
    () => setParams((prev) => clearServiceFilters(prev), { replace: true }),
    [setParams],
  );
  const setPage = useCallback(
    (next: number) => setParams((prev) => writeView(prev, { page: next }), { replace: true }),
    [setParams],
  );
  const setSort = useCallback(
    (next: SortState) => setParams((prev) => writeView(prev, { sort: next, page: 1 }), { replace: true }),
    [setParams],
  );
  /** Names a service (and a part of it) in the address: `?open=<id>[&section=…]`, for the side panel that reads it. */
  const openService = useCallback(
    (id: Id, section?: PanelSection) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('open', String(id));
          if (section) next.set('section', section);
          else next.delete('section');
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  return { filters, page, sort, setFilters, clearFilters, setPage, setSort, openService };
}
