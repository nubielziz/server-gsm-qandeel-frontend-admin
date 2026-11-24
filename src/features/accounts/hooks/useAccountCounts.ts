// The numbers of the strip and the status menu: one aggregate over every account (`GET /admin/clients/counts`), asked again every 30
// seconds and after any write that changes a status, a rank or a login. Replaces the one count call per tab of the two old pages.
import { useApiQuery } from '@/lib/query';
import { getAccountCounts } from '../api';
import { ACCOUNT_COUNTS_KEY, REFRESH_MS } from './keys';

/** The counts. Pass `enabled: false` until the staff member's permissions are known or while they lack `clients:read`. */
export function useAccountCounts(enabled = true) {
  return useApiQuery({
    queryKey: ACCOUNT_COUNTS_KEY,
    queryFn: ({ signal }) => getAccountCounts({ signal }),
    enabled,
    refetchInterval: REFRESH_MS,
  });
}
