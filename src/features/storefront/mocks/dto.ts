// Turns a stored listing into what `GET /admin/service-listings` sends: the service join and the figures a real server works out
// (the floor, the margin, the 30-day orders). The mock plays the server here and does not re-implement more than the demo did.
import { toMoney } from '@/mocks/seed';
import type { ServiceListing } from '../types';
import type { MockListing, Stores } from './types';

/** The demo's `retailFloor`: the B2B base price plus 10%, to the cent. */
export function floorOf(basePrice: number): number {
  return Math.round(basePrice * 110) / 100;
}

/** One listing as the API sends it. */
export function toListing(stores: Stores, row: MockListing): ServiceListing {
  const service = stores.services.get(row.serviceId);
  if (!service) throw new Error(`Listing ${row.id} points at a service the mock does not have.`);
  const retail = stores.retail.get(row.serviceId) ?? null;
  const sales = stores.sales.get(row.serviceId);
  return {
    id: row.id,
    serviceId: row.serviceId,
    locale: row.locale,
    slug: row.slug,
    publicTitle: row.publicTitle,
    isListed: row.isListed,
    isFeatured: row.isFeatured,
    service: {
      id: service.id,
      name: service.name,
      code: service.code,
      basePrice: toMoney(service.basePrice),
      cost: toMoney(service.cost),
    },
    retailPrice: retail === null ? null : toMoney(retail),
    floorPrice: toMoney(floorOf(service.basePrice)),
    marginPct: retail === null ? null : (((retail - service.cost) / retail) * 100).toFixed(4),
    orders30d: sales?.orders ?? 0,
    revenue30d: toMoney(sales?.revenue ?? 0),
    locked: row.lockedReason !== null,
    lockedReason: row.lockedReason,
  };
}
