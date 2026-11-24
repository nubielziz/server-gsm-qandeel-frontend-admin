// The status menu, the sort, the page and the page size of the Data requests view, kept in the address. `change` goes to the same view with
// some keys changed: a change of the status, the sort or the size goes back to the first page, and the history entry is replaced (a filter
// is no step to go back to). An address the view reads differently from how it is written (an unknown status, a stray key of another view)
// is replaced by the one the view would write.
import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { parseRequestsAddress, requestsLink, type RequestsAddress } from './requestsAddress';

// The keys whose change starts again at the first page.
const RESETTING: (keyof RequestsAddress)[] = ['request', 'sort', 'dir', 'size'];

/** What the address says about the view, and how to change it. */
export function useRequestsAddress() {
  const [params] = useSearchParams();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const address = useMemo(() => parseRequestsAddress(params), [params]);

  // Replace an address that is not written the way the view writes it: nothing the view does not read stays in it.
  const canonical = requestsLink(address);
  useEffect(() => {
    if (canonical !== `${pathname}${search}`) void navigate(canonical, { replace: true });
  }, [canonical, pathname, search, navigate]);

  const change = useCallback(
    (patch: Partial<RequestsAddress>) => {
      const resets = RESETTING.some((key) => key in patch);
      void navigate(requestsLink({ ...address, ...(resets ? { page: 1 } : {}), ...patch }), {
        replace: true,
      });
    },
    [navigate, address],
  );

  return { address, change };
}
