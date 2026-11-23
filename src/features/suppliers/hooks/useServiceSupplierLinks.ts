// Reads the supplier chain of one service (`GET /admin/services/:id/supplier-links`) for the Suppliers section of the Catalog panel.
// Its key lives here, beside the only read that uses it; a saved chain makes it stale.
import type { Id } from '@/lib/api';
import { useApiQuery } from '@/lib/query';
import { getServiceSupplierLinks } from '../api';

/** The chain of one service, per service id (decision 005: a read that is not a Refine resource starts with `['api', <feature>]`). */
export const SERVICE_CHAIN_KEY = ['api', 'suppliers', 'service-chain'] as const;

/**
 * The chain of the service, primary first; `[]` for a service with no link. It is read again each time the section opens, because
 * the save replaces the whole chain and an old copy could undo a change made elsewhere. The answer of another service is never
 * shown while this one loads. Pass `enabled: false` to wait.
 */
export function useServiceSupplierLinks(serviceId: Id, options: { enabled?: boolean } = {}) {
  return useApiQuery({
    queryKey: [...SERVICE_CHAIN_KEY, serviceId],
    queryFn: ({ signal }) => getServiceSupplierLinks(serviceId, { signal }),
    enabled: options.enabled ?? true,
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: undefined,
  });
}
