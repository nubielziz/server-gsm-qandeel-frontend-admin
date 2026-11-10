// ListingThumbnail: the small picture of a service in the listings table (feature 22). Draws an empty frame when the service has none,
// so the rows line up.
import { imageSrc } from '../lib/listingForm';
import type { ServiceListing } from '../types';

/** The small picture in the Service cell; an empty frame when the service has none, so the rows line up. */
export function ListingThumbnail({ listing }: { listing: ServiceListing }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-sunken">
      {listing.imageUrl && (
        <img
          src={imageSrc(listing.imageUrl)}
          alt={`Picture of ${listing.service.name}`}
          loading="lazy"
          className="size-full object-cover"
        />
      )}
    </span>
  );
}
