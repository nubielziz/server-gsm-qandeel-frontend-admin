// Tests for the listing API functions, run against the dev mock API: each one reaches its route with the body of its assumed
// contract and reads the answer the way the Services on sale tab does. The mock plays the server, so a change can be checked by
// reading the record again.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { recordRequests } from '../test/requests';
import {
  createListing,
  getListing,
  listListings,
  removeListingImage,
  updateListing,
  uploadListingImage,
} from '.';

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

describe('updateListing content', () => {
  it('sends the content fields and answers the detail with the two Markdown bodies', async () => {
    const requests = recordRequests();
    const updated = await updateListing(ICLOUD, {
      publicTitle: 'iCloud Check',
      summary: 'Is the phone locked?',
      descriptionMd: '# About\n\nWe look it up.',
      requirementsMd: 'The IMEI.',
      etaText: 'Within an hour',
      seoTitle: 'iCloud check',
      seoDescription: 'Check the iCloud lock.',
      brand: 'Apple',
      carrier: 'Any',
      country: 'gb',
      isFeatured: true,
      sort: 7,
    });
    expect(requests.last()).toMatchObject({ method: 'PATCH', body: { country: 'gb', sort: 7 } });
    expect(updated).toMatchObject({
      publicTitle: 'iCloud Check',
      descriptionMd: '# About\n\nWe look it up.',
      requirementsMd: 'The IMEI.',
      country: 'GB',
      isFeatured: true,
      sort: 7,
    });
    expect(await getListing(ICLOUD)).toMatchObject({
      summary: 'Is the phone locked?',
      etaText: 'Within an hour',
    });
    // The list leaves the bodies out.
    const row = (await listListings({ filters: {} })).data.find((l) => l.id === ICLOUD);
    expect(row).toBeDefined();
    expect(row).not.toHaveProperty('descriptionMd');
  });

  it('writes the facts of the service to every language and keeps the text to one', async () => {
    const created = await createListing({ serviceId: ICLOUD, locale: 'ar', publicTitle: 'فحص آيكلاود' });
    await updateListing(ICLOUD, { brand: 'Samsung', summary: 'English only' });
    expect(await getListing(created.id)).toMatchObject({ brand: 'Samsung', summary: '' });
  });

  it('sets listedAt the first time a listing goes on the site and never resets it', async () => {
    const created = await createListing({ serviceId: 2, locale: 'ar', publicTitle: 'Warranty AR' });
    expect(created.listedAt).toBeNull();
    const on = await updateListing(created.id, { isListed: true });
    expect(on.listedAt).not.toBeNull();
    const off = await updateListing(created.id, { isListed: false });
    expect(off.listedAt).toBe(on.listedAt);
  });

  it('refuses a slug of the wrong form with 422 and one that is in use with 409, both on slug', async () => {
    const bad = await updateListing(ICLOUD, { slug: 'Not A Slug' }).catch((e: unknown) => e);
    expect((bad as ApiError).status).toBe(422);
    expect((bad as ApiError).fieldErrors.slug).toBeDefined();
    const other = (await listListings({ start: 0, end: 5 })).data.find((l) => l.id !== ICLOUD)!;
    const taken = await updateListing(ICLOUD, { slug: other.slug }).catch((e: unknown) => e);
    expect((taken as ApiError).status).toBe(409);
    expect((taken as ApiError).code).toBe('LISTING_EXISTS');
    expect((taken as ApiError).fieldErrors.slug).toBeDefined();
  });

  it('refuses a text over its limit with the field named', async () => {
    const error = await updateListing(ICLOUD, { summary: 'x'.repeat(301) }).catch((e: unknown) => e);
    expect((error as ApiError).status).toBe(422);
    expect((error as ApiError).fieldErrors.summary?.[0]).toContain('300');
  });
});

describe('uploadListingImage and removeListingImage', () => {
  const picture = () => new File([new Uint8Array([1, 2, 3])], 'phone.png', { type: 'image/png' });

  it('posts the file as the part named file and answers the detail with the picture address', async () => {
    const requests = recordRequests();
    const updated = await uploadListingImage(ICLOUD, picture());
    const sent = requests.last();
    expect(sent.method).toBe('POST');
    expect(sent.url.pathname).toBe(`/admin/service-listings/${ICLOUD}/image`);
    expect(sent.form?.get('file')).toBeInstanceOf(Blob);
    expect(updated.imageUrl).toEqual(expect.any(String));
    expect((await getListing(ICLOUD)).imageUrl).toBe(updated.imageUrl);
  });

  it('removes the picture with a DELETE that answers 204', async () => {
    await uploadListingImage(ICLOUD, picture());
    const requests = recordRequests();
    await expect(removeListingImage(ICLOUD)).resolves.toBeUndefined();
    expect(requests.last()).toMatchObject({ method: 'DELETE' });
    expect(requests.last().url.pathname).toBe(`/admin/service-listings/${ICLOUD}/image`);
    expect((await getListing(ICLOUD)).imageUrl).toBeNull();
  });

  it('shows the server’s refusal of a type it does not read under file', async () => {
    const gif = new File([new Uint8Array([1])], 'a.gif', { type: 'image/gif' });
    const error = await uploadListingImage(ICLOUD, gif).catch((e: unknown) => e);
    expect((error as ApiError).status).toBe(422);
    expect((error as ApiError).fieldErrors.file?.[0]).toContain('JPEG, PNG or WebP');
  });
});
