// Mock of the listing routes (`/admin/service-listings`, `/:id` and `/:id/image`): list, one listing, create, change (content too)
// and the picture upload and removal. The mock plays the server for the rules the demo had: a locked or disabled service cannot be switched on (`setListed`), and a
// price under the floor is refused with the demo's sentence (`setRetailPrice`).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { money } from '@/lib/format';
import { filePartOf } from './multipart';
import { floorOf, toListing, toListingDetail } from './dto';
import { ruleFor } from './pricingDto';
import { readContent, type FieldProblem } from './listingFields';
import { bodyOf, conflict, idOf, invalid, listAnswer, notFound, signedIn, slugOf, textOf } from './http';
import { problem } from '@/mocks/problem';
import { storefrontStore } from './store';
import type { MockService, Stores } from './types';

const SEARCH_FIELDS = ['publicTitle', 'slug', 'service.name', 'service.code'];

/** A body price (`"12.5"` or `12.5`) as a number, or null when it is not one. */
function amountOf(value: unknown): number | null {
  const number = typeof value === 'string' ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) ? number : null;
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

/** The refusals of `retailPricing: 'rule'` (and the write when there are none): a body that mixes it with a price, no cost, no rule. */
function followRule(
  stores: Stores,
  service: MockService,
  lockedReason: string | null,
  body: Record<string, unknown>,
): Response | null {
  const refuse = (message: string) => invalid([{ field: 'retailPricing', message }]);
  if (body.retailPricing !== 'rule') return refuse('Use "rule".');
  if ('retailPrice' in body) return refuse('Send either a price or the pricing rule, not both.');
  if (lockedReason) {
    return conflict(
      'LISTING_LOCKED',
      'Can’t price this service',
      `${lockedReason}. This service cannot be listed publicly.`,
    );
  }
  if (service.cost <= 0) return refuse('This service has no cost, so a rule cannot price it.');
  const rule = ruleFor(stores, service.id);
  const price = stores.pricing.rulePrices.get(service.id);
  if (!rule || price === undefined) return refuse('No pricing rule covers this service.');
  stores.retail.set(service.id, Number(price));
  stores.pricing.sources.set(service.id, { source: 'rule', ruleId: rule.id });
  return null;
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
      const errors: FieldProblem[] = [];
      if (!service) errors.push({ field: 'serviceId', message: 'Choose a service.' });
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
      // A service has one listing, and a slug belongs to one listing.
      const same = stores.listings.list().find((row) => row.serviceId === service.id || row.slug === slug);
      if (same) {
        const field = same.serviceId === service.id ? 'serviceId' : 'slug';
        const message =
          field === 'serviceId' ? 'This service already has a listing.' : `The slug ${slug} is already used.`;
        return conflict('LISTING_EXISTS', 'Listing already exists', message, [{ field, message }]);
      }
      const created = stores.listings.insert({
        summary: '',
        descriptionMd: '',
        requirementsMd: '',
        etaText: '',
        seoTitle: '',
        seoDescription: '',
        brand: '',
        carrier: '',
        country: '',
        sort: 0,
        isFeatured: false,
        imageUrl: null,
        ...content,
        serviceId: service.id,
        slug,
        publicTitle: title,
        isListed: false,
        listedAt: null,
        updatedAt: new Date().toISOString(),
        lockedReason: null,
      });
      return HttpResponse.json(toListingDetail(stores, created), { status: 201 });
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
          .some((other) => other.id !== row.id && other.slug === content.slug);
        if (taken)
          return conflict('LISTING_EXISTS', 'Listing already exists', message, [{ field: 'slug', message }]);
      }

      // "Follow the pricing rule": the server writes the rule's price now (a fixed figure in the mock) and the price follows from then on.
      if ('retailPricing' in body) {
        const refusal = followRule(stores, service, row.lockedReason, body);
        if (refusal) return refusal;
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
        // A typed price stops the price following a rule.
        stores.pricing.sources.set(service.id, { source: 'manual', ruleId: null });
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
        stores.listings.patch(row.id, { ...content, updatedAt: new Date().toISOString() });
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
      stores.listings.patch(row.id, { imageUrl: pictureUrl(file, row.serviceId) });
      return HttpResponse.json(toListingDetail(stores, stores.listings.find(row.id) ?? row));
    }),
  ),

  http.delete('*/admin/service-listings/:id/image', ({ request, params }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      const row = stores.listings.find(String(params.id));
      if (!row) return notFound('listing', params.id);
      stores.listings.patch(row.id, { imageUrl: null });
      return new HttpResponse(null, { status: 204 });
    }),
  ),
];
