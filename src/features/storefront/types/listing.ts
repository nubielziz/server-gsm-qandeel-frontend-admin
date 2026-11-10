// Types of the "Services on sale" tab: a storefront listing as `GET /admin/service-listings` sends it, and the bodies of
// the listing endpoints. The map gives the table (`service_listings`) but no bodies or joins, so the shapes beyond the
// generated row are assumed contracts (listed in HANDOFF.md).
import type { Decimal, Id, Money } from '@/lib/api';
import type { ServiceListingRow } from '@/lib/api/schema.gen';

/** The service behind a listing: the figures the table shows next to the retail price. */
export type ListingService = {
  id: Id;
  name: string;
  code: string;
  /** The B2B base price merchants pay. */
  basePrice: Money;
  cost: Money;
};

/**
 * One listing (assumed contract). `retailPrice` is the storefront price of the service, `floorPrice` the lowest price the
 * server accepts for it, and `marginPct`, `orders30d` and `revenue30d` are worked out by the server; the console never
 * computes them. A `locked` listing can never go on the public site and `lockedReason` says why.
 */
export type ServiceListing = Pick<
  ServiceListingRow,
  'id' | 'serviceId' | 'locale' | 'slug' | 'publicTitle' | 'isListed' | 'isFeatured'
> & {
  service: ListingService;
  retailPrice: Money | null;
  floorPrice: Money;
  marginPct: Decimal | null;
  orders30d: number;
  revenue30d: Money;
  locked: boolean;
  lockedReason: string | null;
};

/** Body of `POST /admin/service-listings` (assumed contract). Without a `slug` the server makes one from the title. */
export type CreateListingBody = {
  serviceId: Id;
  locale: string;
  publicTitle: string;
  slug?: string;
};

/** Body of `PATCH /admin/service-listings/:id` (assumed contract): the switch sends `isListed`, the price dialog `retailPrice`. */
export type UpdateListingBody = {
  isListed?: boolean;
  retailPrice?: Money;
};

/** What `GET /admin/service-listings` filters by: `q` (title, slug, service name or code), `isListed` and `locked`. */
export type ListingListFilters = {
  q?: string;
  isListed?: boolean;
  locked?: boolean;
};
