// The merchant names behind the issue-invoice dialog's picker. They are read once and kept for a few minutes: the list
// changes rarely, and the dialog should not wait for a request each time it opens.
import { useApiQuery } from '@/lib/query';
import { listMerchantOptions } from '../api/lookups';
import { MERCHANT_LOOKUP_KEY } from './keys';

const FIVE_MINUTES = 5 * 60_000;

/** The merchants. Pass `enabled: false` when the staff member lacks `clients:read`. */
export function useMerchantOptions(enabled = true) {
  return useApiQuery({
    queryKey: MERCHANT_LOOKUP_KEY,
    queryFn: ({ signal }) => listMerchantOptions({ signal }),
    select: (result) => result.data,
    enabled,
    staleTime: FIVE_MINUTES,
  });
}
