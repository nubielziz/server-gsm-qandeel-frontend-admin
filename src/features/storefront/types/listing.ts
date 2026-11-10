// Types of the "Services on sale" tab: a storefront listing as `GET /admin/service-listings` sends it, and the bodies of
// the listing endpoints. The map gives the table (`service_listings`) but no bodies or joins, so the shapes beyond the
// generated row are typed by hand from the backend's contracts (feature 22; see HANDOFF.md).
import type { Decimal, Id, IsoDateTime, Money } from '@/lib/api';
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
 * One listing row of `GET /admin/service-listings`. `retailPrice` is the storefront price of the service, `floorPrice` the
 * lowest price the server accepts for it, and `marginPct`, `orders30d` and `revenue30d` are worked out by the server; the
 * console never computes them. A `locked` listing can never go on the public site and `lockedReason` says why.
 * Typed by hand beyond the generated row (the map's row has no `listedAt` or `imageUrl`, and a different `updatedAt`).
 * `brand`, `carrier`, `country`, `sort`, `isFeatured` and `imageUrl` describe the service and are the same in every
 * language; the rest of the text is per language. `imageUrl` is a root-relative `/store/v1/media/<name>` path.
 */
export type ServiceListing = Pick<
  ServiceListingRow,
  | 'id'
  | 'serviceId'
  | 'locale'
  | 'slug'
  | 'publicTitle'
  | 'summary'
  | 'etaText'
  | 'brand'
  | 'carrier'
  | 'country'
  | 'sort'
  | 'seoTitle'
  | 'seoDescription'
  | 'isListed'
  | 'isFeatured'
> & {
  /** When the listing first went on the site; `null` until then. */
  listedAt: IsoDateTime | null;
  updatedAt: IsoDateTime;
  imageUrl: string | null;
  service: ListingService;
  retailPrice: Money | null;
  floorPrice: Money;
  marginPct: Decimal | null;
  orders30d: number;
  revenue30d: Money;
  locked: boolean;
  lockedReason: string | null;
};

/** A listing with its two Markdown bodies: what show, create, change and the image upload answer (the list leaves them out). */
export type ServiceListingDetail = ServiceListing & {
  descriptionMd: string;
  requirementsMd: string;
};

/**
 * The content fields `POST` and `PATCH /admin/service-listings` share, all optional. Per language: `summary`, `descriptionMd`,
 * `requirementsMd`, `etaText`, `seoTitle`, `seoDescription`. The server writes these to every language of the service:
 * `brand`, `carrier`, `country` (empty or two letters), `isFeatured`, `sort` (0 to 1,000,000).
 */
export type ListingContentFields = {
  summary?: string;
  descriptionMd?: string;
  requirementsMd?: string;
  etaText?: string;
  seoTitle?: string;
  seoDescription?: string;
  brand?: string;
  carrier?: string;
  country?: string;
  isFeatured?: boolean;
  sort?: number;
};

/** Body of `POST /admin/service-listings`. Without a `slug` the server makes one from the title. */
export type CreateListingBody = ListingContentFields & {
  serviceId: Id;
  locale: string;
  publicTitle: string;
  slug?: string;
};

/**
 * Body of `PATCH /admin/service-listings/:id`: any of these, at least one. The switch sends `isListed`, the price dialog
 * `retailPrice`, the editor the title, slug and content fields. A changed `slug` changes the public link.
 */
export type UpdateListingBody = ListingContentFields & {
  isListed?: boolean;
  retailPrice?: Money;
  publicTitle?: string;
  slug?: string;
};

/** What `GET /admin/service-listings` filters by: `q` (title, slug, service name or code), `isListed`, `locked` and `isFeatured`. */
export type ListingListFilters = {
  q?: string;
  isListed?: boolean;
  locked?: boolean;
  isFeatured?: boolean;
};
