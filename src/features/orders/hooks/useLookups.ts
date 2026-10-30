// The supplier and merchant names behind the filter menus and the reroute menu. They are read once and kept for a few
// minutes: the lists change rarely, and a menu should not wait for a request each time the page opens.
import { listClients } from '@/features/merchants';
import { useApiQuery } from '@/lib/query';
import { LOOKUP_CAP, listSupplierOptions } from '../api/lookups';
import type { ClientOption } from '../types';
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
    // The merchants feature owns `GET /admin/clients`; the menu needs only ids and names, first 200 by name.
    queryFn: ({ signal }) =>
      listClients({ start: 0, end: LOOKUP_CAP, sort: ['name'], order: ['asc'] }, { signal }),
    select: (result): ClientOption[] => result.data.map(({ id, name }) => ({ id, name })),
    enabled,
    staleTime: FIVE_MINUTES,
  });
}
