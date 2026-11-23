// What a save of the listing form sends, shared by the Edit listing dialog and the service editor's shop page section.
import { changedBody, type ListingFormValues } from '../../lib/listingForm';
import type { ServiceListing, ServiceListingDetail, UpdateListingBody } from '../../types';

/** The request a save makes, as `useUpdateListingContent().mutateAsync` gives it. */
export type UpdateListing = (args: {
  listing: ServiceListing;
  body: UpdateListingBody;
}) => Promise<ServiceListingDetail>;

/**
 * Sends only the fields that differ from the listing the form was read from. Answers the saved listing the server sent back, or
 * `null` when nothing differs (no request is made).
 */
export async function saveListingForm(
  values: ListingFormValues,
  listing: ServiceListingDetail,
  update: UpdateListing,
): Promise<ServiceListingDetail | null> {
  const body = changedBody(values, listing);
  if (Object.keys(body).length === 0) return null;
  return update({ listing, body });
}
