// The supplier chain of a service (`PUT /admin/services/:id/supplier-links`). The demo kept it as two fields on a service
// (`sup` and `fb`); the map keeps it as ordered links. The suppliers page edits it from its Services table ("Edit links…").
import { apiPut, pathOf, type ApiInit, type Id } from '@/lib/api';
import type { ChainStep, ReplaceLinksBody } from '../types';

/**
 * Replaces the supplier chain of a service: the first link is the primary supplier, the next ones take over when it is
 * disabled or fails. Sending an empty list unlinks the service, and its orders then wait for manual dispatch. The server
 * checks that each supplier service exists and belongs to a supplier that can take it.
 * Assumed contract: body `{ links: [{ supplierServiceId, priority }] }`, answer the new chain in order.
 * @route PUT /admin/services/:id/supplier-links
 */
export function replaceSupplierLinks(
  serviceId: Id,
  body: ReplaceLinksBody,
  init?: ApiInit,
): Promise<ChainStep[]> {
  return apiPut<ChainStep[]>(pathOf('/admin/services/:id/supplier-links', { id: serviceId }), body, init);
}
