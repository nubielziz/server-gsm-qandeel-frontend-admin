// The storefront listings (`/admin/service-listings*`): the "Services on sale" tab of the Storefront page and the listing editor.
// Ports the data side of `tabListings`, `setListed` and `setRetailPrice` (50-p-storefront.js, 12-state-b2c.js). The map gives no
// bodies (MISMATCHES M10); the shapes follow the backend's contracts of feature 22 (`listings.contracts.ts`).
import {
  apiDelete,
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
import type { CreateListingBody, ServiceListing, ServiceListingDetail, UpdateListingBody } from '../types';

/**
 * The listings, one page of them, with the total in `x-total-count`. Filters: `q`, `isListed`, `locked`, `isFeatured` and
 * `locale` (`en` or `ar`; the search tab's pin picker lists English listings only);
 * sort with `_sort`/`_order` on `publicTitle`, `isListed`, `slug`, `id`, `listedAt` or `sort`. The counts above the table are
 * this call with `_start=0&_end=1`. Rows carry the service join, the figures the server works out and the listing's content
 * (without the two Markdown bodies, which `getListing` has).
 * @route GET /admin/service-listings
 */
export function listListings(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<ServiceListing>> {
  return apiList<ServiceListing>('/admin/service-listings', query, undefined, init);
}

/**
 * One listing with its description and requirements (Markdown), for the editor.
 * @route GET /admin/service-listings/:id
 */
export function getListing(id: Id, init?: ApiInit): Promise<ServiceListingDetail> {
  return apiGet<ServiceListingDetail>(pathOf('/admin/service-listings/:id', { id }), undefined, init);
}

/**
 * Puts a service on the storefront in one language (a listing with a title and a slug). The server refuses a service that
 * can never be public and a listing that already exists. The content fields of an edit may be sent too.
 * @route POST /admin/service-listings
 */
export function createListing(body: CreateListingBody, init?: ApiInit): Promise<ServiceListingDetail> {
  return apiPost<ServiceListingDetail>('/admin/service-listings', body, init);
}

/**
 * Changes a listing: the "On the site" switch (`isListed`), the retail price dialog (`retailPrice`) and the editor (title,
 * slug, summary, Markdown bodies, delivery note, search texts, and the facts of the service: brand, carrier, country,
 * featured, position). At least one field. The server refuses a price under the floor, a service that cannot be listed, a
 * slug that is not lower-case words with hyphens (422) or already used in the language (409), and says why.
 * @route PATCH /admin/service-listings/:id
 */
export function updateListing(
  id: Id,
  body: UpdateListingBody,
  init?: ApiInit,
): Promise<ServiceListingDetail> {
  return apiPatch<ServiceListingDetail>(pathOf('/admin/service-listings/:id', { id }), body, init);
}

/**
 * Uploads the picture of the listing's service (it applies to every language and replaces the previous one). Sent as
 * `multipart/form-data` with one part `file`; the browser sets the boundary. The server reads the type from the content
 * and answers 422 on `file` (`empty`, `unsupported_type`, `corrupt`, `animated`, `too_small`, `too_large_dimensions`,
 * `rotated`), 413 over 2 MiB or 415 for a body it does not read.
 * @route POST /admin/service-listings/:id/image
 */
export function uploadListingImage(id: Id, file: File, init?: ApiInit): Promise<ServiceListingDetail> {
  const form = new FormData();
  form.append('file', file);
  return apiPost<ServiceListingDetail>(pathOf('/admin/service-listings/:id/image', { id }), form, init);
}

/**
 * Removes the picture of the listing's service in every language. Answers 204 also when there was none.
 * @route DELETE /admin/service-listings/:id/image
 */
export function removeListingImage(id: Id, init?: ApiInit): Promise<void> {
  return apiDelete<void>(pathOf('/admin/service-listings/:id/image', { id }), undefined, init);
}
