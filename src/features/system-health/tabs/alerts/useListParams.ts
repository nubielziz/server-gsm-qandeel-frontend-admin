// The filter and page of a list in the Alerts & incidents tab (`?status=`, `?page=`), kept in the address. Ports no demo
// page. A filter change goes back to page 1; both replace the history entry (Back should leave the page).
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { parsePage } from './alertsView';

/**
 * `[page, setPage]` from `?page=`. Page 1 leaves no parameter. Other parameters (view, status, incident) stay.
 */
export function usePageParam(): [number, (next: number) => void] {
  const [params, setParams] = useSearchParams();
  const page = parsePage(params.get('page'));
  const setPage = useCallback(
    (next: number) =>
      setParams(
        (previous) => {
          const updated = new URLSearchParams(previous);
          if (next <= 1) updated.delete('page');
          else updated.set('page', String(next));
          return updated;
        },
        { replace: true },
      ),
    [setParams],
  );
  return [page, setPage];
}

/**
 * `?status=` as one of a list's choices, with the page. `parse` turns the raw text into a choice (unknown text becomes the
 * default); the default leaves no parameter, like the other pages' defaults.
 */
export function useStatusParam<S extends string>(parse: (raw: string | null) => S, initial: S) {
  const [params, setParams] = useSearchParams();
  const [page, setPage] = usePageParam();
  const status = parse(params.get('status'));
  const setStatus = useCallback(
    (next: S) =>
      setParams(
        (previous) => {
          const updated = new URLSearchParams(previous);
          if (next === initial) updated.delete('status');
          else updated.set('status', next);
          updated.delete('page');
          return updated;
        },
        { replace: true },
      ),
    [initial, setParams],
  );
  return { status, setStatus, page, setPage };
}
