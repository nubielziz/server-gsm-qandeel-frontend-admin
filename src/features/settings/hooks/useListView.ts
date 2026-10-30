// The address-bound state of one tab: its filters, page and the open drawer (`?status=failed&page=2&delivery=7`). Filter changes replace
// the history entry (Back should leave the page, not walk through every choice) and go back to page 1; opening a drawer adds one, so Back closes it.
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/** A whole number from an address parameter, or null. */
function idOf(raw: string | null): number | null {
  return raw !== null && /^\d+$/.test(raw) ? Number(raw) : null;
}

/**
 * `filters` holds the text of each named parameter (empty when absent). `drawer` names the parameter that carries the open row's id;
 * pass an empty text for a tab without a drawer.
 */
export function useListView(filterNames: readonly string[], drawer = '') {
  const [params, setParams] = useSearchParams();

  const filters: Record<string, string> = {};
  for (const name of filterNames) filters[name] = params.get(name) ?? '';
  const pageNumber = idOf(params.get('page'));
  const openId = drawer ? idOf(params.get(drawer)) : null;

  const setFilters = useCallback(
    (patch: Record<string, string>) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [name, value] of Object.entries(patch)) {
            if (value) next.set(name, value);
            else next.delete(name);
          }
          next.delete('page');
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  const setPage = useCallback(
    (page: number) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (page > 1) next.set('page', String(page));
          else next.delete('page');
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  const open = useCallback(
    (id: number) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (drawer) next.set(drawer, String(id));
        return next;
      }),
    [setParams, drawer],
  );
  const close = useCallback(
    () =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (drawer) next.delete(drawer);
          return next;
        },
        { replace: true },
      ),
    [setParams, drawer],
  );

  return {
    filters,
    page: pageNumber !== null && pageNumber >= 1 ? pageNumber : 1,
    openId,
    setFilters,
    setPage,
    open,
    close,
  };
}
