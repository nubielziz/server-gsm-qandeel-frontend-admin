// The supplier and merchant names behind the filter menus and the reroute menu. They are read once and kept for a few
// minutes: the lists change rarely, and a menu should not wait for a request each time the page opens.
import { useApiQuery } from '@/lib/query';
import { listClientOptions, listSupplierOptions } from '../api/lookups';
import { ORDER_LOOKUP_KEY } from './keys';

const FIVE_MINUTES = 5 * 60_000;

/** The suppliers. Pass `enabled: false` when the staff member lacks `suppliers:read`. */
export function useSupplierOptions(enabled = true) {
  return useApiQuery({
    queryKey: [...ORDER_LOOKUP_KEY, 'suppliers'],
    queryFn: ({ signal }) => listSupplierOptions({ signal }),
    select: (result) => result.data,
    enabled,
    staleTime: FIVE_MINUTES,
  });
}

/** The merchants. Pass `enabled: false` when the staff member lacks `clients:read`. */
export function useClientOptions(enabled = true) {
  return useApiQuery({
    queryKey: [...ORDER_LOOKUP_KEY, 'clients'],
    queryFn: ({ signal }) => listClientOptions({ signal }),
    select: (result) => result.data,
    enabled,
    staleTime: FIVE_MINUTES,
  });
}
