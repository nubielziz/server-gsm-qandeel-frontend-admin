// The supplier chain of a service (`GET` and `PUT /admin/services/:id/supplier-links`). The demo kept it as two fields on a
// service (`sup` and `fb`); the map keeps it as ordered links. The suppliers page edits it from its Services table ("Edit links…"),
// and the Catalog panel reads and edits it for any service, also one that has no link yet.
import { apiGet, apiPut, pathOf, type ApiInit, type Id } from '@/lib/api';
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

/**
 * Reads the supplier chain of one service: the suppliers that take its orders, the primary first and then the fallbacks, in
 * priority order. A service with no link answers an empty list; an unknown service answers 404. Why: a service with no link
 * is in no supplier's detail, so the Catalog panel has no other way to show its chain or to start one.
 * Assumed contract: the same list the save above answers, `ChainStep[]`.
 * @route GET /admin/services/:id/supplier-links
 */
export function getServiceSupplierLinks(serviceId: Id, init?: ApiInit): Promise<ChainStep[]> {
  return apiGet<ChainStep[]>(
    pathOf('/admin/services/:id/supplier-links', { id: serviceId }),
    undefined,
    init,
  );
}
