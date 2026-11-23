// The actions on listings, each with the toast the demo showed and the reads it makes stale. Ports the toast of `sf-price` in
// 50-p-storefront.js; the editor's save and the picture upload and removal are new (feature 22). (The shop switch of a service is the
// services feature's usePutOnShop.) The hooks leave a refusal to the form that called them, which shows it under the field or in its error
// slot.
import { toast } from '@/components/ui';
import type { Id } from '@/lib/api';
import { money } from '@/lib/format';
import { SERVICE_ROWS_KEY, LISTING_DETAILS_KEY, useApiMutation, type InvalidateTarget } from '@/lib/query';
import { removeListingImage, updateListing, uploadListingImage } from '../api';
import type { ServiceListing, UpdateListingBody } from '../types';
import { STOREFRONT_STALE_KEYS, staleResource } from './keys';

const NO_ERROR_TOAST = () => false as const;
const RESOURCE = 'service-listings';
// A listing change also moves the shop facts of the services lists' rows (shop page, shop price, attention), and makes the read copy of
// the listing old (an editor open on it, like the service editor's, takes the new one).
const STALE_KEYS = [...STOREFRONT_STALE_KEYS, SERVICE_ROWS_KEY, LISTING_DETAILS_KEY];

/**
 * The service records a shop price write makes stale: every list, and the service's own record, which the service editor keeps open (its
 * group prices and its attention reasons carry the shop price). The `services` resource is the services feature's; only its name is used.
 */
export function staleServiceRecords(...ids: readonly Id[]): InvalidateTarget[] {
  return [{ resource: 'services' }, ...ids.map((id) => ({ resource: 'services', id }))];
}

/** Saves a new storefront price. The toast says the price the server stored; a refusal under the floor shows in the dialog. */
export function useSetRetailPrice() {
  return useApiMutation({
    mutationFn: ({ listing, retailPrice }: { listing: ServiceListing; retailPrice: string }) =>
      updateListing(listing.id, { retailPrice }),
    invalidates: (_updated, { listing }) => [
      ...staleResource(RESOURCE),
      ...staleServiceRecords(listing.serviceId),
    ],
    invalidateKeys: STALE_KEYS,
    onSuccess: (updated, { listing }) => {
      toast({
        kind: 'success',
        title: 'Price saved',
        body: `${listing.publicTitle} is now ${money(updated.retailPrice ?? listing.retailPrice ?? 0)} on the storefront.`,
        ttl: 2800,
      });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/**
 * Prices a listing by the retail pricing rule: the server writes the rule's price now and keeps it up to date from then on. The
 * dialog shows a refusal (no rule covers the service, the service has no cost) under the choice.
 */
export function useFollowRule() {
  return useApiMutation({
    mutationFn: (listing: ServiceListing) => updateListing(listing.id, { retailPricing: 'rule' }),
    invalidates: (_updated, listing) => [
      ...staleResource(RESOURCE),
      ...staleResource('retail-price-changes'),
      ...staleServiceRecords(listing.serviceId),
    ],
    invalidateKeys: STALE_KEYS,
    onSuccess: (updated, listing) => {
      toast({
        kind: 'success',
        title: 'Price follows the rule',
        body: `${listing.publicTitle} is now ${money(updated.retailPrice ?? listing.retailPrice ?? 0)} on the storefront.`,
        ttl: 3200,
      });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Saves the changed fields of the editor. The dialog shows a refusal (a slug in use, a text over its limit) under the field. */
export function useUpdateListingContent() {
  return useApiMutation({
    mutationFn: ({ listing, body }: { listing: ServiceListing; body: UpdateListingBody }) =>
      updateListing(listing.id, body),
    invalidates: staleResource(RESOURCE),
    invalidateKeys: STALE_KEYS,
    onSuccess: (updated) => {
      toast({ kind: 'success', title: 'Listing saved', body: updated.publicTitle, ttl: 2600 });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Uploads the picture of the service. The field under the picture shows the server's refusal. */
export function useUploadListingImage() {
  return useApiMutation({
    mutationFn: ({ listing, file }: { listing: ServiceListing; file: File }) =>
      uploadListingImage(listing.id, file),
    invalidates: staleResource(RESOURCE),
    invalidateKeys: STALE_KEYS,
    onSuccess: (updated) => {
      toast({ kind: 'success', title: 'Picture saved', body: updated.publicTitle, ttl: 2600 });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Removes the picture of the service. */
export function useRemoveListingImage() {
  return useApiMutation({
    mutationFn: (listing: ServiceListing) => removeListingImage(listing.id),
    invalidates: staleResource(RESOURCE),
    invalidateKeys: STALE_KEYS,
    onSuccess: (_result, listing) => {
      toast({ kind: 'success', title: 'Picture removed', body: listing.publicTitle, ttl: 2600 });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}
