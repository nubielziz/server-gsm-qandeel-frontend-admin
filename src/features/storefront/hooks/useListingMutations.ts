// The actions on listings, each with the toast the demo showed and the reads it makes stale. Ports the toasts of `sf-list` and
// `sf-price` in 50-p-storefront.js. The switch leaves a failed call to the default error toast (the server's words); the hooks
// used from a dialog leave it to that dialog, which shows it under the field or in its error slot.
import { toast } from '@/components/ui';
import { money } from '@/lib/format';
import { useApiMutation } from '@/lib/query';
import { createListing, updateListing } from '../api';
import type { CreateListingBody, ServiceListing } from '../types';
import { STOREFRONT_STALE_KEYS, staleResource } from './keys';

const NO_ERROR_TOAST = () => false as const;
const RESOURCE = 'service-listings';

/** The "On the site" switch: the service goes on the public site, or comes off it. */
export function useSetListed() {
  return useApiMutation({
    mutationFn: ({ listing, on }: { listing: ServiceListing; on: boolean }) =>
      updateListing(listing.id, { isListed: on }),
    invalidates: staleResource(RESOURCE),
    invalidateKeys: STOREFRONT_STALE_KEYS,
    onSuccess: (_updated, { listing, on }) => {
      toast({
        kind: 'success',
        title: on ? 'Now on the storefront' : 'Removed from the storefront',
        body: listing.publicTitle,
        ttl: 2600,
      });
    },
  });
}

/** Saves a new storefront price. The toast says the price the server stored; a refusal under the floor shows in the dialog. */
export function useSetRetailPrice() {
  return useApiMutation({
    mutationFn: ({ listing, retailPrice }: { listing: ServiceListing; retailPrice: string }) =>
      updateListing(listing.id, { retailPrice }),
    invalidates: staleResource(RESOURCE),
    invalidateKeys: STOREFRONT_STALE_KEYS,
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

/** Adds a listing. The dialog shows a refusal (a service that cannot be public, a listing that already exists). */
export function useCreateListing() {
  return useApiMutation({
    mutationFn: (body: CreateListingBody) => createListing(body),
    invalidates: staleResource(RESOURCE),
    invalidateKeys: STOREFRONT_STALE_KEYS,
    onSuccess: (created) => {
      toast({
        kind: 'success',
        title: 'Listing added',
        body: `${created.publicTitle} is ready. Set its price, then switch it on.`,
        ttl: 3200,
      });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}
