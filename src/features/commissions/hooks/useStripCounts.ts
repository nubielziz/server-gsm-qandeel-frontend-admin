// The header strip's counts: the ready accruals (the status button's count, passed in) and the approved accruals earned in the last
// 30 days. The second is the list call with `status=approved&createdAt_gte=…&_start=0&_end=1`, read from `x-total-count`, so the server
// does the counting. Ports the data side of `comStrip` in 46-p-commissions.js; no amount is added up here.
import { useApiQuery } from '@/lib/query';
import { listAccruals } from '../api';
import { windowStart, type StripCounts } from '../lib/figures';
import { FIGURES_KEY } from './keys';

/** `ready` is the ready count from `useAccrualCounts`; `enabled` is false until the staff member's permissions are known. */
export function useStripCounts(ready: number | undefined, enabled = true): StripCounts {
  const since = windowStart(Date.now());
  const approved30 = useApiQuery({
    queryKey: [...FIGURES_KEY, 'approved30', since],
    queryFn: async ({ signal }) =>
      (
        await listAccruals(
          { start: 0, end: 1, filters: { status: 'approved', createdAt_gte: since } },
          { signal },
        )
      ).total,
    enabled,
  });
  return { ready, approved30: approved30.data };
}
