// Mock of the listing routes (`/admin/service-listings` and `/admin/service-listings/:id`): list, one listing, create and change.
// The mock plays the server for the rules the demo had: a locked or disabled service cannot be switched on (`setListed`), and a
// price under the floor is refused with the demo's sentence (`setRetailPrice`).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { money } from '@/lib/format';
import { toListing, floorOf } from './dto';
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
import { storefrontStore } from './store';

const SEARCH_FIELDS = ['publicTitle', 'slug', 'service.name', 'service.code'];

/** A body price (`"12.5"` or `12.5`) as a number, or null when it is not one. */
function amountOf(value: unknown): number | null {
  const number = typeof value === 'string' ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) ? number : null;
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
      return row ? HttpResponse.json(toListing(stores, row)) : notFound('listing', params.id);
    }),
  ),

  http.post('*/admin/service-listings', ({ request }) =>
    signedIn(request, async () => {
      const stores = await storefrontStore();
      const body = await bodyOf(request);
      const serviceId = idOf(body.serviceId);
      const service = serviceId === null ? undefined : stores.services.get(serviceId);
      const title = textOf(body.publicTitle);
      const locale = textOf(body.locale);
      const errors = [];
      if (!service) errors.push({ field: 'serviceId', message: 'Choose a service.' });
      if (!LOCALES.includes(locale)) errors.push({ field: 'locale', message: 'Choose a language.' });
      if (!title) errors.push({ field: 'publicTitle', message: 'Enter the title customers see.' });
      if (errors.length > 0 || !service) return invalid(errors);

      const locked = stores.listings.list().find((row) => row.serviceId === service.id && row.lockedReason);
      if (locked) {
        return conflict(
          'LISTING_LOCKED',
          'Can’t list this service',
          `${locked.lockedReason}. This service cannot be listed publicly.`,
        );
      }
      const slug = textOf(body.slug) || slugOf(title);
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
      const created = stores.listings.insert({
        serviceId: service.id,
        locale,
        slug,
        publicTitle: title,
        isListed: false,
        isFeatured: false,
        lockedReason: null,
      });
      return HttpResponse.json(toListing(stores, created), { status: 201 });
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
        stores.listings.patch(row.id, { isListed: body.isListed });
      }
      return HttpResponse.json(toListing(stores, stores.listings.find(row.id) ?? row));
    }),
  ),
];
