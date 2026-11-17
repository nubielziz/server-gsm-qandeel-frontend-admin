// Turns a stored listing into what `GET /admin/service-listings` sends: the service join and the figures a real server works out
// (the floor, the margin, the 30-day orders). The mock plays the server here and does not re-implement more than the demo did.
import { toMoney } from '@/mocks/seed';
import type { ServiceListing, ServiceListingDetail } from '../types';
import { ruleLabel } from './pricingDto';
import type { MockListing, Stores } from './types';

/** The demo's `retailFloor`: the B2B base price plus 10%, to the cent. */
export function floorOf(basePrice: number): number {
  return Math.round(basePrice * 110) / 100;
}

/** One listing as the list sends it: without the two Markdown bodies. */
export function toListing(stores: Stores, row: MockListing): ServiceListing {
  const service = stores.services.get(row.serviceId);
  if (!service) throw new Error(`Listing ${row.id} points at a service the mock does not have.`);
  const retail = stores.retail.get(row.serviceId) ?? null;
  const sales = stores.sales.get(row.serviceId);
  const written = stores.pricing.sources.get(row.serviceId);
  const rule = written?.ruleId == null ? undefined : stores.pricing.rules.find(written.ruleId);
  return {
    id: row.id,
    serviceId: row.serviceId,
    slug: row.slug,
    publicTitle: row.publicTitle,
    summary: row.summary,
    etaText: row.etaText,
    brand: row.brand,
    carrier: row.carrier,
    country: row.country,
    sort: row.sort,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    isListed: row.isListed,
    isFeatured: row.isFeatured,
    listedAt: row.listedAt,
    updatedAt: row.updatedAt,
    imageUrl: row.imageUrl,
    service: {
      id: service.id,
      name: service.name,
      code: service.code,
      basePrice: toMoney(service.basePrice),
      cost: toMoney(service.cost),
    },
    retailPrice: retail === null ? null : toMoney(retail),
    // Who wrote the price: a rule (which one) or a person; a proposal that waits for this service shows as "waiting".
    retailPriceSource: retail === null ? null : (written?.source ?? 'manual'),
    retailPriceRule:
      retail !== null && written?.source === 'rule' && rule
        ? { id: rule.id, label: ruleLabel(stores, rule) }
        : null,
    retailPriceWaiting: stores.pricing.changes
      .list()
      .some((change) => change.serviceId === row.serviceId && change.waiting),
    floorPrice: toMoney(floorOf(service.basePrice)),
    marginPct: retail === null ? null : (((retail - service.cost) / retail) * 100).toFixed(4),
    orders30d: sales?.orders ?? 0,
    revenue30d: toMoney(sales?.revenue ?? 0),
    locked: row.lockedReason !== null,
    lockedReason: row.lockedReason,
  };
}

/** One listing as show, create, change and the picture upload send it: the row plus its two Markdown bodies. */
export function toListingDetail(stores: Stores, row: MockListing): ServiceListingDetail {
  return { ...toListing(stores, row), descriptionMd: row.descriptionMd, requirementsMd: row.requirementsMd };
}
