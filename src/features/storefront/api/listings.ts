// The storefront listings (`/admin/service-listings*`): the "Services on sale" tab of the Storefront page. Ports the data
// side of `tabListings`, `setListed` and `setRetailPrice` (50-p-storefront.js, 12-state-b2c.js). The map gives no bodies
// (MISMATCHES M10), so shapes are assumed contracts.
import {
  apiGet,
  apiList,
  apiPatch,
  apiPost,
  pathOf,
  type ApiInit,
  type Id,
  type ListQuery,
  type ListResult,
} from '@/lib/api';
import type { CreateListingBody, ServiceListing, UpdateListingBody } from '../types';

/**
 * The listings, one page of them, with the total in `x-total-count`. Filters: `q`, `isListed` and `locked`; sort with
 * `_sort`/`_order` on `publicTitle` or `isListed`. The counts above the table are this call with `_start=0&_end=1`.
 * Assumed contract: rows carry the service join and the figures the server works out (`retailPrice`, `floorPrice`,
 * `marginPct`, `orders30d`, `revenue30d`, `locked`, `lockedReason`).
 * @route GET /admin/service-listings
 */
export function listListings(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<ServiceListing>> {
  return apiList<ServiceListing>('/admin/service-listings', query, undefined, init);
}

/**
 * One listing.
 * Assumed contract: same fields as a list row.
 * @route GET /admin/service-listings/:id
 */
export function getListing(id: Id, init?: ApiInit): Promise<ServiceListing> {
  return apiGet<ServiceListing>(pathOf('/admin/service-listings/:id', { id }), undefined, init);
}

/**
 * Puts a service on the storefront in one language (a listing with a title and a slug). The server refuses a service that
 * can never be public and a listing that already exists.
 * Assumed contract: body `{ serviceId, locale, publicTitle, slug? }`, answer the new listing.
 * @route POST /admin/service-listings
 */
export function createListing(body: CreateListingBody, init?: ApiInit): Promise<ServiceListing> {
  return apiPost<ServiceListing>('/admin/service-listings', body, init);
}

/**
 * Changes a listing: the "On the site" switch (`isListed`) and the retail price dialog (`retailPrice`). The server refuses
 * a price under the floor and a service that cannot be listed, and says why; the screens show its words.
 * Assumed contract: body is any of `isListed` and `retailPrice`, answer the updated listing.
 * @route PATCH /admin/service-listings/:id
 */
export function updateListing(id: Id, body: UpdateListingBody, init?: ApiInit): Promise<ServiceListing> {
  return apiPatch<ServiceListing>(pathOf('/admin/service-listings/:id', { id }), body, init);
}
