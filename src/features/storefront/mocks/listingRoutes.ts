// Mock of the listing routes (`/admin/service-listings`, `/:id` and `/:id/image`): list, one listing, create, change (content too)
// and the picture upload and removal. The mock plays the server for the rules the demo had: a locked or disabled service cannot be switched on (`setListed`), and a
// price under the floor is refused with the demo's sentence (`setRetailPrice`).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { money } from '@/lib/format';
import { filePartOf } from './multipart';
import { floorOf, toListing, toListingDetail } from './dto';
import { readContent, splitContent, type FieldProblem } from './listingFields';
import {
  bodyOf,
  conflict,
  idOf,
  invalid,
  listAnswer,
  LOCALES,
  notFound,
  signedIn,
  slugOf,
  textOf,
} from './http';
import { problem } from '@/mocks/problem';
import { storefrontStore } from './store';
import type { MockListing, Stores } from './types';

const SEARCH_FIELDS = ['publicTitle', 'slug', 'service.name', 'service.code'];

/** A body price (`"12.5"` or `12.5`) as a number, or null when it is not one. */
function amountOf(value: unknown): number | null {
  const number = typeof value === 'string' ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) ? number : null;
}

/** Writes the facts of a service to the listing of every language, as the server does. */
function writeFacts(stores: Stores, row: MockListing, facts: Partial<MockListing>): void {
  if (Object.keys(facts).length === 0) return;
  for (const other of stores.listings.list()) {
    if (other.serviceId === row.serviceId) stores.listings.patch(other.id, facts);
  }
}

const PICTURE_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);
const PICTURE_MAX_BYTES = 2 * 1024 * 1024;

/** An address for an uploaded picture: an object URL in the browser, a made-up media path where there is none (tests). */
function pictureUrl(file: { type: string; bytes: Uint8Array }, serviceId: number): string {
  if (typeof URL.createObjectURL === 'function')
    return URL.createObjectURL(new Blob([file.bytes as BlobPart], { type: file.type }));
  return `/store/v1/media/mock-${serviceId}-${Date.now()}.${PICTURE_TYPES.get(file.type) ?? 'png'}`;
}

/** The listing routes. */
export const listingRoutes: HttpHandler[] = [
  http.get('*/admin/service-listings', ({ request }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      return listAnswer(
        stores.listings.list().map((row) => toListing(stores, row)),
        request,
        SEARCH_FIELDS,
      );
    }),
  ),

  http.get('*/admin/service-listings/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      const row = stores.listings.find(String(params.id));
      return row ? HttpResponse.json(toListingDetail(stores, row)) : notFound('listing', params.id);
    }),
  ),

  http.post('*/admin/service-listings', ({ request }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      const body = await bodyOf(request);
      const serviceId = idOf(body.serviceId);
      const service = serviceId === null ? undefined : stores.services.get(serviceId);
      const locale = textOf(body.locale);
      const errors: FieldProblem[] = [];
      if (!service) errors.push({ field: 'serviceId', message: 'Choose a service.' });
      if (!LOCALES.includes(locale)) errors.push({ field: 'locale', message: 'Choose a language.' });
      // `publicTitle` is required on create; the other content fields are read the way a change reads them.
      const content = readContent({ ...body, publicTitle: textOf(body.publicTitle) }, errors);
      if (errors.length > 0 || !service) return invalid(errors);

      const locked = stores.listings.list().find((row) => row.serviceId === service.id && row.lockedReason);
      if (locked) {
        return conflict(
          'LISTING_LOCKED',
          'Can’t list this service',
          `${locked.lockedReason}. This service cannot be listed publicly.`,
        );
      }
      const title = content.publicTitle ?? '';
      const slug = content.slug ?? slugOf(title);
      const siblings = stores.listings.list().filter((row) => row.serviceId === service.id);
      const same = stores.listings
        .list()
        .find((row) => row.locale === locale && (row.serviceId === service.id || row.slug === slug));
      if (same) {
        const field = same.serviceId === service.id ? 'serviceId' : 'slug';
        const message =
          field === 'serviceId'
            ? 'This service already has a listing in that language.'
            : `The slug ${slug} is already used.`;
        return conflict('LISTING_EXISTS', 'Listing already exists', message, [{ field, message }]);
      }
      // The facts of the service not sent are copied from its oldest listing (another language).
      const oldest = siblings[0];
      const created = stores.listings.insert({
        summary: '',
        descriptionMd: '',
        requirementsMd: '',
        etaText: '',
        seoTitle: '',
        seoDescription: '',
        brand: oldest?.brand ?? '',
        carrier: oldest?.carrier ?? '',
        country: oldest?.country ?? '',
        sort: oldest?.sort ?? 0,
        isFeatured: false,
        imageUrl: oldest?.imageUrl ?? null,
        ...content,
        serviceId: service.id,
        locale,
        slug,
        publicTitle: title,
        isListed: false,
        listedAt: null,
        updatedAt: new Date().toISOString(),
        lockedReason: null,
      });
      writeFacts(stores, created, splitContent(content).facts);
      return HttpResponse.json(toListingDetail(stores, stores.listings.find(created.id) ?? created), {
        status: 201,
      });
    }),
  ),

  http.patch('*/admin/service-listings/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      const row = stores.listings.find(String(params.id));
      if (!row) return notFound('listing', params.id);
      const service = stores.services.get(row.serviceId);
      if (!service) return notFound('service', row.serviceId);
      const body = await bodyOf(request);
      if (Object.keys(body).length === 0)
        return invalid([{ field: 'body', message: 'Send at least one field to change.' }]);
      const problems: FieldProblem[] = [];
      const content = readContent(body, problems);
      if (problems.length > 0) return invalid(problems);
      if (content.slug !== undefined) {
        const message = `The slug ${content.slug} is already used.`;
        const taken = stores.listings
          .list()
          .some((other) => other.id !== row.id && other.locale === row.locale && other.slug === content.slug);
        if (taken)
          return conflict('LISTING_EXISTS', 'Listing already exists', message, [{ field: 'slug', message }]);
      }

      if ('retailPrice' in body) {
        const value = amountOf(body.retailPrice);
        if (value === null || value <= 0)
          return invalid([{ field: 'retailPrice', message: 'Enter a price greater than zero.' }]);
        if (row.lockedReason) {
          return conflict(
            'LISTING_LOCKED',
            'Can’t price this service',
            `${row.lockedReason}. This service cannot be listed publicly.`,
          );
        }
        if (value < floorOf(service.basePrice)) {
          return invalid([
            {
              field: 'retailPrice',
              message: `Below the floor. The storefront must stay above the B2B base price (${money(service.basePrice)} plus 10%), or merchants would buy from the storefront instead.`,
            },
          ]);
        }
        stores.retail.set(service.id, Math.round(value * 100) / 100);
      }
      if ('isListed' in body && typeof body.isListed === 'boolean') {
        if (body.isListed && row.lockedReason) {
          return conflict(
            'LISTING_LOCKED',
            'Can’t list this service',
            `${row.lockedReason}. This service cannot be listed publicly.`,
          );
        }
        if (body.isListed && service.status !== 'active') {
          return conflict(
            'SERVICE_DISABLED',
            'Can’t list this service',
            `${service.name} is disabled. Enable the service first.`,
          );
        }
        // The first time a listing goes on the site sets `listedAt`; it is never reset.
        stores.listings.patch(row.id, {
          isListed: body.isListed,
          listedAt: row.listedAt ?? (body.isListed ? new Date().toISOString() : null),
        });
      }
      if (Object.keys(content).length > 0) {
        const { own, facts } = splitContent(content);
        stores.listings.patch(row.id, { ...own, updatedAt: new Date().toISOString() });
        writeFacts(stores, row, facts);
      }
      return HttpResponse.json(toListingDetail(stores, stores.listings.find(row.id) ?? row));
    }),
  ),

  http.post('*/admin/service-listings/:id/image', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      const row = stores.listings.find(String(params.id));
      if (!row) return notFound('listing', params.id);
      if (!(request.headers.get('content-type') ?? '').startsWith('multipart/form-data')) {
        return problem(
          415,
          'UNSUPPORTED_MEDIA_TYPE',
          'Unsupported media type',
          'Send the picture as multipart/form-data.',
        );
      }
      const file = await filePartOf(request);
      if (!file) return invalid([{ field: 'file', message: 'Choose a picture to upload.' }]);
      if (file.bytes.length > PICTURE_MAX_BYTES) {
        return problem(413, 'PAYLOAD_TOO_LARGE', 'Picture too large', 'A picture can be at most 2 MiB.');
      }
      if (!PICTURE_TYPES.has(file.type)) {
        return invalid([{ field: 'file', message: 'Use a JPEG, PNG or WebP picture.' }]);
      }
      writeFacts(stores, row, { imageUrl: pictureUrl(file, row.serviceId) });
      return HttpResponse.json(toListingDetail(stores, stores.listings.find(row.id) ?? row));
    }),
  ),

  http.delete('*/admin/service-listings/:id/image', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      const row = stores.listings.find(String(params.id));
      if (!row) return notFound('listing', params.id);
      writeFacts(stores, row, { imageUrl: null });
      return new HttpResponse(null, { status: 204 });
    }),
  ),
];
