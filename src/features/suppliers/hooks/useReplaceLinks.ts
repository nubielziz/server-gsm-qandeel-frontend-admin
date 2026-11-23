// Saves the supplier chain of a service from the "Edit links" dialog or the supplier connection of a service. Both show a
// failed call themselves, so no error toast.
import type { Id } from '@/lib/api';
import { SERVICE_ROWS_KEY, useApiMutation } from '@/lib/query';
import { replaceSupplierLinks } from '../api';
import type { ReplaceLinksBody } from '../types';
import { staleSupplier, SUPPLIER_CATALOGUE_KEY, SUPPLIER_STALE_KEYS } from './keys';
import { SERVICE_CHAIN_KEY } from './useServiceSupplierLinks';

/** What the editor hands over: the service, the new chain, its name for the toast and the suppliers the change touches. */
export type ReplaceLinksVariables = {
  serviceId: Id;
  serviceName: string;
  body: ReplaceLinksBody;
  /** Every supplier in the old or the new chain: each one's detail lists the service, so each is made stale. */
  supplierIds: readonly Id[];
};

/**
 * Replaces a service's chain. The suppliers that gained or lost the service, the service's own chain read and the services lists
 * are made stale; the `services` resource is too, so a detail that shows the primary supplier is read again.
 */
export function useReplaceLinks() {
  return useApiMutation({
    mutationFn: ({ serviceId, body }: ReplaceLinksVariables) => replaceSupplierLinks(serviceId, body),
    invalidates: (_chain, { serviceId, supplierIds }) => [
      ...supplierIds.flatMap((id) => staleSupplier(id)),
      { resource: 'services', id: serviceId },
    ],
    // The services lists' rows show the primary supplier and the no-supplier reason.
    invalidateKeys: [SUPPLIER_CATALOGUE_KEY, SERVICE_CHAIN_KEY, ...SUPPLIER_STALE_KEYS, SERVICE_ROWS_KEY],
    successNotification: (_chain, { body, serviceName }) => ({
      message: 'Supplier links updated',
      description:
        body.links.length === 0
          ? `${serviceName} has no supplier now. Its orders wait for manual dispatch.`
          : `${serviceName} now uses ${body.links.length} ${body.links.length === 1 ? 'supplier' : 'suppliers'}, in order.`,
    }),
    errorNotification: () => false as const,
  });
}
