// Tests for the listing API functions, run against the dev mock API: each one reaches its route with the body of its assumed
// contract and reads the answer the way the Services on sale tab does. The mock plays the server, so a change can be checked by
// reading the record again.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { recordRequests } from '../test/requests';
import { createListing, getListing, listListings, updateListing } from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

// Records of the mock seed (taken from the demo; see mocks/seed.ts).
const ICLOUD = 1; // iCloud Clean / Lost Check: listed, retail 3.99
const MDM = 11; // MDM Removal: locked to B2B
const TOTAL = 14;

describe('listListings', () => {
  it('sends the range, sort, search and filters and reads the total from the header', async () => {
    const requests = recordRequests();
    const page = await listListings({
      start: 0,
      end: 5,
      sort: ['publicTitle'],
      order: ['desc'],
      q: 'unlock',
      filters: { isListed: true },
    });
    const { method, url } = requests.last();
    expect(method).toBe('GET');
    expect(url.pathname).toBe('/admin/service-listings');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      _start: '0',
      _end: '5',
      _sort: 'publicTitle',
      _order: 'desc',
      q: 'unlock',
      isListed: 'true',
    });
    expect(page.data.length).toBeGreaterThan(0);
    expect(page.total).toBeGreaterThanOrEqual(page.data.length);
  });

  it('gives the service join and the figures the server worked out', async () => {
    const listing = await getListing(ICLOUD);
    expect(listing).toMatchObject({
      id: ICLOUD,
      locale: 'en',
      isListed: true,
      locked: false,
      lockedReason: null,
      retailPrice: '3.9900',
      service: { code: 'IMEI-ICL-CHK', name: 'iCloud Clean / Lost Check' },
    });
    expect(Number(listing.floorPrice)).toBeGreaterThan(Number(listing.service.basePrice));
    expect(listing.marginPct).not.toBeNull();
  });

  it('counts with a one-row range and the locked filter', async () => {
    const all = await listListings({ start: 0, end: 1 });
    const locked = await listListings({ start: 0, end: 1, filters: { locked: true } });
    expect(all.total).toBe(TOTAL);
    expect(locked.total).toBe(3);
  });
});

describe('getListing', () => {
  it('reads one listing and fails with the server’s 404 for an unknown id', async () => {
    expect((await getListing(MDM)).lockedReason).toContain('High risk');
    await expect(getListing(999)).rejects.toBeInstanceOf(ApiError);
  });
});

describe('updateListing', () => {
  it('switches a listing off and sends only isListed', async () => {
    const requests = recordRequests();
    const updated = await updateListing(ICLOUD, { isListed: false });
    expect(requests.last()).toMatchObject({ method: 'PATCH', body: { isListed: false } });
    expect(requests.last().url.pathname).toBe(`/admin/service-listings/${ICLOUD}`);
    expect(updated.isListed).toBe(false);
  });

  it('saves a retail price and reads the new one back', async () => {
    const updated = await updateListing(ICLOUD, { retailPrice: '4.5000' });
    expect(updated.retailPrice).toBe('4.5000');
    expect((await getListing(ICLOUD)).retailPrice).toBe('4.5000');
  });

  it('refuses a price under the floor with the server’s words under the field', async () => {
    const error = await updateListing(ICLOUD, { retailPrice: '0.0100' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(422);
    expect((error as ApiError).fieldErrors.retailPrice?.[0]).toContain('Below the floor');
  });

  it('refuses to list a locked service', async () => {
    const error = await updateListing(MDM, { isListed: true }).catch((e: unknown) => e);
    expect((error as ApiError).status).toBe(409);
    expect((error as ApiError).detail).toContain('cannot be listed publicly');
  });
});

describe('createListing', () => {
  it('adds a listing in another language, not yet on the site, with a slug made from the title', async () => {
    const requests = recordRequests();
    const created = await createListing({
      serviceId: 2,
      locale: 'ar',
      publicTitle: 'Apple Warranty Check AR',
    });
    expect(requests.last()).toMatchObject({
      method: 'POST',
      body: { serviceId: 2, locale: 'ar', publicTitle: 'Apple Warranty Check AR' },
    });
    expect(created).toMatchObject({ locale: 'ar', isListed: false, slug: 'apple-warranty-check-ar' });
  });

  it('refuses a second listing of the same service in the same language', async () => {
    const error = await createListing({ serviceId: 2, locale: 'en', publicTitle: 'Again' }).catch(
      (e: unknown) => e,
    );
    expect((error as ApiError).status).toBe(409);
    expect((error as ApiError).fieldErrors.serviceId?.[0]).toContain('already has a listing');
  });
});
