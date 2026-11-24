// The strip's population, the Quick Search filters, the sort, the page and the page size of the All view, kept in the address. `change` goes
// to the same list with some keys changed: a change of a filter, the sort or the size goes back to the first page, and the history entry
// is replaced (a filter is no step to go back to). An address the page reads differently from how it is written (an old `chip=suspended`,
// an unknown value, a sort the role may not use) is replaced by the one the page would write. The address the list has is also kept for
// the session (lastListAddress), so a record's "Back to All" and the strip's tabs return to it.
import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { rememberListAddress } from '../frame/lastListAddress';
import { listLink, parseListAddress, usableSort, type ListAddress } from './listAddress';

// The keys whose change starts again at the first page.
const RESETTING: (keyof ListAddress)[] = ['chip', 'status', 'rank', 'country', 'q', 'sort', 'dir', 'size'];

/** What the address says about the list, and how to change it. `wallet`: the role may read wallets (the balance sort is open to it). */
export function useListAddress(access: { wallet: boolean }) {
  const [params] = useSearchParams();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const parsed = useMemo(() => parseListAddress(params), [params]);
  const { wallet } = access;
  const address = useMemo<ListAddress>(
    () => ({ ...parsed, sort: usableSort(parsed.sort, { wallet }) }),
    [parsed, wallet],
  );

  // Replace an address that is not written the way the page writes it: nothing the page does not read stays in it.
  const canonical = listLink(address);
  useEffect(() => {
    if (canonical !== `${pathname}${search}`) void navigate(canonical, { replace: true });
  }, [canonical, pathname, search, navigate]);

  useEffect(() => {
    rememberListAddress(address);
  }, [address]);

  const change = useCallback(
    (patch: Partial<ListAddress>) => {
      const resets = RESETTING.some((key) => key in patch);
      void navigate(listLink({ ...address, ...(resets ? { page: 1 } : {}), ...patch }), { replace: true });
    },
    [navigate, address],
  );

  return { address, change };
}
