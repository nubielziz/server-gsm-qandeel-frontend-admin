// The listing editor's form: its values, how a listing fills them, and how the changed ones become the PATCH body. Pure text
// reshaping and comparing; every rule (lengths, slug form, country, position) is decided by the server, and the limits here
// are only hints that stop an obviously long text before it is sent.
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { apiUrl } from '@/lib/api';
import type { ServiceListingDetail, UpdateListingBody } from '../types';

/** What the editor's inputs hold. Numbers and booleans are text and a checkbox, as inputs give them. */
export type ListingFormValues = {
  publicTitle: string;
  slug: string;
  summary: string;
  descriptionMd: string;
  requirementsMd: string;
  etaText: string;
  seoTitle: string;
  seoDescription: string;
  brand: string;
  carrier: string;
  country: string;
  isFeatured: boolean;
  sort: string;
};

/** What each group of fields of the editor takes from the form. */
export type ListingFieldsProps = {
  register: UseFormRegister<ListingFormValues>;
  errors: FieldErrors<ListingFormValues>;
  /** Text direction of the per-language inputs: `'rtl'` for an Arabic listing, undefined (browser default) otherwise. */
  dir?: 'rtl';
};

/** The longest text each field accepts (the server's limits, used as `maxLength` hints). */
export const LISTING_LIMITS = {
  publicTitle: 200,
  slug: 120,
  summary: 300,
  descriptionMd: 20_000,
  requirementsMd: 10_000,
  etaText: 80,
  seoTitle: 200,
  seoDescription: 400,
  brand: 80,
  carrier: 80,
} as const;

/** The form's field names, so a server message about any other field falls to the dialog's error slot. */
export const LISTING_FORM_FIELDS = [
  'publicTitle',
  'slug',
  'summary',
  'descriptionMd',
  'requirementsMd',
  'etaText',
  'seoTitle',
  'seoDescription',
  'brand',
  'carrier',
  'country',
  'isFeatured',
  'sort',
] as const;

/** The most a position may be (the server's limit). */
export const MAX_SORT = 1_000_000;

/** The values the editor starts from, taken from the listing the server sent. */
export function toFormValues(listing: ServiceListingDetail): ListingFormValues {
  return {
    publicTitle: listing.publicTitle,
    slug: listing.slug,
    summary: listing.summary,
    descriptionMd: listing.descriptionMd,
    requirementsMd: listing.requirementsMd,
    etaText: listing.etaText,
    seoTitle: listing.seoTitle,
    seoDescription: listing.seoDescription,
    brand: listing.brand,
    carrier: listing.carrier,
    country: listing.country,
    isFeatured: listing.isFeatured,
    sort: String(listing.sort),
  };
}

/** The short text fields; they lose stray spaces at the ends, as the server trims them too. */
const SHORT_TEXT = [
  'publicTitle',
  'slug',
  'summary',
  'etaText',
  'seoTitle',
  'seoDescription',
  'brand',
  'carrier',
] as const;

/** The two Markdown bodies; they are kept exactly as typed (spaces and new lines count). */
const MARKDOWN = ['descriptionMd', 'requirementsMd'] as const;

/**
 * The fields that differ from the listing, as the PATCH body; empty when nothing changed. The server stores a country in
 * upper case, so it is compared and sent that way.
 */
export function changedBody(values: ListingFormValues, listing: ServiceListingDetail): UpdateListingBody {
  const body: UpdateListingBody = {};
  for (const field of SHORT_TEXT) {
    const next = values[field].trim();
    if (next !== listing[field]) body[field] = next;
  }
  for (const field of MARKDOWN) {
    if (values[field] !== listing[field]) body[field] = values[field];
  }
  const country = values.country.trim().toUpperCase();
  if (country !== listing.country) body.country = country;
  if (values.isFeatured !== listing.isFeatured) body.isFeatured = values.isFeatured;
  const sort = Number(values.sort);
  if (sort !== listing.sort) body.sort = sort;
  return body;
}

/** True for a whole number from 0 up to the server's limit: a hint for the position field. */
export function isPosition(text: string): boolean {
  const value = text.trim();
  return /^\d+$/.test(value) && Number(value) <= MAX_SORT;
}

/** True for a country code the server takes: empty, or two letters. A hint for the form. */
export function isCountryText(text: string): boolean {
  return /^([A-Za-z]{2})?$/.test(text.trim());
}

/** The picture types the server reads (it checks the content, not the name), for the file input's `accept`. */
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** The largest picture the server takes: 2 MiB. */
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;

/**
 * A client check of a chosen file before it is sent: a sentence when it is clearly refused, else `null`. The server decides
 * (it reads the content, the size in pixels and more) and its words show if this passes.
 */
export function imageProblem(file: Pick<File, 'type' | 'size'>): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return 'Choose a JPEG, PNG or WebP picture.';
  if (file.size > IMAGE_MAX_BYTES) return 'The picture is over 2 MiB. Choose a smaller file.';
  return null;
}

/**
 * Where to load a listing's picture from. The server sends a root-relative `/store/v1/media/<name>` path of the API's own
 * address, so it is joined with the API base; an absolute, `blob:` or `data:` address is used as it is.
 */
export function imageSrc(imageUrl: string): string {
  return /^(https?:|blob:|data:)/i.test(imageUrl) ? imageUrl : apiUrl(imageUrl);
}
