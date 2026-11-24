// The page and the page size of the Ranks view, kept in the address (`?view=ranks&page=2&size=25`). The ranks are read whole and cut into pages
// here. A change goes to the same view with the history entry replaced (a page is no step to go back to); a change of size starts at page 1.
import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { accountsListPath } from '../../lib/paths';
import { parseRanksAddress } from './rankList';

/** What the address says about the page, and how to change it. */
export function useRanksAddress() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { page, size } = useMemo(() => parseRanksAddress(params), [params]);

  const go = useCallback(
    (next: { page: number; size: number }) =>
      void navigate(accountsListPath({ view: 'ranks', ...next }), { replace: true }),
    [navigate],
  );
  const setPage = useCallback((next: number) => go({ page: next, size }), [go, size]);
  const setSize = useCallback((next: number) => go({ page: 1, size: next }), [go]);
  return { page, size, setPage, setSize };
}
