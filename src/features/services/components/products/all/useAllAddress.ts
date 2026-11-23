// The filters, page and page size of the All view, kept in the address. `change` goes to the same list with some keys changed: a change
// of a filter or of the size goes back to the first page, and the history entry is replaced (a filter is no step to go back to). The
// address the list has is also kept for the session (lastAllAddress), so the editor's "Back to All" returns to it.
import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { ServiceType } from '@/lib/serviceTypes';
import { allLink, parseAllAddress, type AllAddress } from './allAddress';
import { rememberAllAddress } from './lastAllAddress';

const RESETTING: (keyof AllAddress)[] = ['q', 'group', 'api', 'show', 'size'];

/** What the address says about the list of a kind, and how to change it. */
export function useAllAddress(type: ServiceType) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const address = useMemo(() => parseAllAddress(params), [params]);

  useEffect(() => {
    rememberAllAddress(type, address);
  }, [type, address]);

  const change = useCallback(
    (patch: Partial<AllAddress>) => {
      const resets = RESETTING.some((key) => key in patch);
      void navigate(allLink(type, { ...address, ...(resets ? { page: 1 } : {}), ...patch }), {
        replace: true,
      });
    },
    [navigate, type, address],
  );

  return { address, change };
}
