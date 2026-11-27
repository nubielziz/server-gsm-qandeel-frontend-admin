// Tests for the listing editor's pure helpers: filling the form from a listing, building the changed-only body, and the client
// checks on a chosen picture and on the address it is loaded from.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  changedBody,
  hasCustomMoreOptions,
  IMAGE_MAX_BYTES,
  imageProblem,
  imageSrc,
  isCountryText,
  isPosition,
  moreOptionsHaveError,
  toFormValues,
} from './listingForm';
import type { ServiceListingDetail } from '../types';

const listing: ServiceListingDetail = {
  id: 5,
  serviceId: 5,
  slug: 'att-unlock',
  publicTitle: 'AT&T Unlock',
  summary: 'Unlock an AT&T iPhone.',
  etaText: '',
  brand: 'Apple',
  carrier: 'AT&T',
  country: 'US',
  sort: 2,
  seoTitle: '',
  seoDescription: '',
  isListed: true,
  isFeatured: false,
  listedAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
  imageUrl: null,
  service: { id: 5, name: 'AT&T', code: 'IMEI-ATT', basePrice: '17.2800', cost: '13.5000' },
  retailPrice: '25.9900',
  retailPriceSource: 'manual',
  retailPriceRule: null,
  retailPriceWaiting: false,
  floorPrice: '19.0100',
  marginPct: '48.0569',
  orders30d: 0,
  revenue30d: '0.0000',
  locked: false,
  lockedReason: null,
  descriptionMd: 'Line one.\n\nLine two.  ',
  requirementsMd: '',
};

describe('changedBody', () => {
  it('is empty when the form is as the listing was', () => {
    expect(changedBody(toFormValues(listing), listing)).toEqual({});
  });

  it('sends only the fields that changed, trimming short texts and keeping Markdown as typed', () => {
    const values = {
      ...toFormValues(listing),
      publicTitle: '  AT&T USA Unlock  ',
      descriptionMd: 'Line one.\n\nLine two.  \n',
      carrier: 'Verizon',
    };
    expect(changedBody(values, listing)).toEqual({
      publicTitle: 'AT&T USA Unlock',
      descriptionMd: 'Line one.\n\nLine two.  \n',
      carrier: 'Verizon',
    });
  });

  it('compares Markdown exactly, but a short text after trimming', () => {
    const values = {
      ...toFormValues(listing),
      summary: ' Unlock an AT&T iPhone. ',
      descriptionMd: 'Line one.\n\nLine two.',
    };
    expect(changedBody(values, listing)).toEqual({ descriptionMd: 'Line one.\n\nLine two.' });
  });

  it('sends a cleared text as an empty string, the country in upper case, the position as a number and the featured flag', () => {
    const values = {
      ...toFormValues(listing),
      summary: '',
      country: ' gb ',
      sort: '10',
      isFeatured: true,
    };
    expect(changedBody(values, listing)).toEqual({ summary: '', country: 'GB', sort: 10, isFeatured: true });
  });

  it('treats 02 as the position 2', () => {
    expect(changedBody({ ...toFormValues(listing), sort: '02' }, listing)).toEqual({});
  });

  it('has no address in the form and never sends one', () => {
    expect(toFormValues(listing)).not.toHaveProperty('slug');
    // Even a form that somehow carries a slug does not put it in the body.
    const values = { ...toFormValues(listing), slug: 'another-address' };
    expect(changedBody(values, listing)).toEqual({});
  });
});

describe('the "More options" fold', () => {
  it('stays closed for a shop page whose four hidden inputs hold their defaults', () => {
    expect(hasCustomMoreOptions({ etaText: '', sort: 0, seoTitle: '', seoDescription: '' })).toBe(false);
  });

  it('starts open when any hidden input holds a value of its own', () => {
    const base = { etaText: '', sort: 0, seoTitle: '', seoDescription: '' };
    expect(hasCustomMoreOptions({ ...base, etaText: 'Within a day' })).toBe(true);
    expect(hasCustomMoreOptions({ ...base, sort: 3 })).toBe(true);
    expect(hasCustomMoreOptions({ ...base, seoTitle: 'Unlock' })).toBe(true);
    expect(hasCustomMoreOptions({ ...base, seoDescription: 'Unlock it' })).toBe(true);
  });

  it('is forced open by an error under any of its inputs, and by nothing else', () => {
    expect(moreOptionsHaveError({})).toBe(false);
    expect(moreOptionsHaveError({ summary: { type: 'server', message: 'Too long.' } })).toBe(false);
    for (const field of ['etaText', 'sort', 'seoTitle', 'seoDescription'] as const) {
      expect(moreOptionsHaveError({ [field]: { type: 'server', message: 'No.' } })).toBe(true);
    }
  });
});

describe('hints', () => {
  it('accepts a whole position up to the limit only', () => {
    expect(['0', '7', ' 1000000 '].map(isPosition)).toEqual([true, true, true]);
    expect(['', '-1', '1.5', 'x', '1000001'].map(isPosition)).toEqual([false, false, false, false, false]);
  });

  it('accepts an empty country or two letters', () => {
    expect(['', 'GB', 'gb'].map(isCountryText)).toEqual([true, true, true]);
    expect(['G', 'GBR', '12'].map(isCountryText)).toEqual([false, false, false]);
  });
});

describe('imageProblem', () => {
  it('lets JPEG, PNG and WebP up to 2 MiB through', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(imageProblem({ type, size: IMAGE_MAX_BYTES })).toBeNull();
    }
  });

  it('refuses another type and a file over 2 MiB, in words', () => {
    expect(imageProblem({ type: 'image/gif', size: 10 })).toBe('Choose a JPEG, PNG or WebP picture.');
    expect(imageProblem({ type: 'image/svg+xml', size: 10 })).toBe('Choose a JPEG, PNG or WebP picture.');
    expect(imageProblem({ type: 'image/png', size: IMAGE_MAX_BYTES + 1 })).toBe(
      'The picture is over 2 MiB. Choose a smaller file.',
    );
  });
});

describe('imageSrc', () => {
  beforeEach(() => vi.stubEnv('VITE_API_BASE_URL', 'http://api.test'));
  afterEach(() => vi.unstubAllEnvs());

  it('joins the root-relative media path with the API address and leaves absolute addresses alone', () => {
    expect(imageSrc('/store/v1/media/abc.webp')).toBe('http://api.test/store/v1/media/abc.webp');
    expect(imageSrc('blob:http://localhost/1')).toBe('blob:http://localhost/1');
    expect(imageSrc('https://cdn.example/a.png')).toBe('https://cdn.example/a.png');
  });
});
