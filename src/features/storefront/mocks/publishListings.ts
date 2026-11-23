// What a mock publish apply writes besides the row's result: the shop page (listing) of a service it published, with its price, so a
// published service shows as on the shop afterwards (as the server does in the same step). The mock does no arithmetic (M92): the
// price is the one the row already showed.
import { slugOf } from './http';
import type { PublishItem } from '../types';
import type { MockListing, Stores } from './types';

/**
 * Gives the service of a published row its shop page, switched on or off as the run says, and the price and the source of the row.
 * Answers the id of the new page, or `null` when the mock writes none: the service has a page already, or it is one of the
 * preview's invented rows (the mock has no figures for it, and a listing is read together with its service).
 */
export function createListingFor(stores: Stores, item: PublishItem, listed: boolean): number | null {
  const service = stores.services.get(item.serviceId);
  if (!service) return null;
  const rows = stores.listings.list();
  if (rows.some((row) => row.serviceId === service.id)) return null;

  const at = new Date().toISOString();
  const title = item.title || service.name;
  const wanted = item.slug || slugOf(title);
  const taken = new Set(rows.map((row) => row.slug));
  // A slug belongs to one listing; the real server blocks the row, the mock keeps the page and makes the address its own.
  const slug = taken.has(wanted) ? `${wanted}-${service.id}` : wanted;
  const created = stores.listings.insert({
    serviceId: service.id,
    slug,
    publicTitle: title,
    summary: '',
    descriptionMd: '',
    requirementsMd: '',
    etaText: '',
    seoTitle: '',
    seoDescription: '',
    brand: item.brand,
    carrier: item.carrier,
    country: item.country,
    sort: rows.reduce((top, row) => Math.max(top, row.sort), 0) + 1,
    isListed: listed,
    isFeatured: false,
    listedAt: listed ? at : null,
    updatedAt: at,
    imageUrl: null,
    lockedReason: null,
  } satisfies Omit<MockListing, 'id'>);

  // "Keep" leaves the price the service has; a rule or a typed price writes the row's price and says who wrote it.
  if (item.retailPrice !== null && item.priceMode !== 'keep') {
    stores.retail.set(service.id, Number(item.retailPrice));
    stores.pricing.sources.set(
      service.id,
      item.priceMode === 'manual'
        ? { source: 'manual', ruleId: null }
        : { source: 'rule', ruleId: item.rule?.id ?? null },
    );
  }
  return created.id;
}

/** The run switch moves the shop pages its rows made (the seeded runs' rows point at no page of the mock, and are left alone). */
export function switchListingOf(stores: Stores, item: PublishItem, listed: boolean): void {
  if (item.listingId === null) return;
  const row = stores.listings.find(item.listingId);
  if (!row || row.serviceId !== item.serviceId) return;
  stores.listings.patch(row.id, {
    isListed: listed,
    listedAt: row.listedAt ?? (listed ? new Date().toISOString() : null),
  });
}
