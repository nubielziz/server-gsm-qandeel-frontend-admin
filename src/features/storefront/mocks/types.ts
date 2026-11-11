// What the storefront mock server keeps. Content pages, help articles, legal documents and TAC entries are stored in the shape the
// API sends them (the console types), the listings as rows that are joined with their service when they are read.
import type { Collection } from '@/mocks/db';
import type { ContentPage, HelpArticle, LegalDocument, TacEntry } from '../types';

/** A service the listings point at: the fields the listings table joins. Prices are in dollars, as the demo kept them. */
export type MockService = {
  id: number;
  name: string;
  code: string;
  status: 'active' | 'disabled';
  basePrice: number;
  cost: number;
};

/** A listing row before the join with its service and the retail price. */
export type MockListing = {
  id: number;
  serviceId: number;
  locale: string;
  slug: string;
  publicTitle: string;
  summary: string;
  descriptionMd: string;
  requirementsMd: string;
  etaText: string;
  seoTitle: string;
  seoDescription: string;
  /** The facts of the service (brand, carrier, country, position, featured, picture) are kept on every language row alike. */
  brand: string;
  carrier: string;
  country: string;
  sort: number;
  isListed: boolean;
  isFeatured: boolean;
  /** When the listing first went on the site; `null` until then. */
  listedAt: string | null;
  updatedAt: string;
  /** The picture's address: an object URL in the browser, a made-up media path in tests. */
  imageUrl: string | null;
  /** Why the service can never go on the public site; `null` when it can. */
  lockedReason: string | null;
};

/** Orders from the storefront in the last 30 days, per service. */
export type MockSales = { orders: number; revenue: number };

/** Everything the mock server keeps for this feature. */
export type Stores = {
  listings: Collection<MockListing>;
  services: ReadonlyMap<number, MockService>;
  /** Storefront price by service id, in dollars. */
  retail: Map<number, number>;
  sales: ReadonlyMap<number, MockSales>;
  pages: Collection<ContentPage>;
  help: Collection<HelpArticle>;
  legal: Collection<LegalDocument>;
  tac: Collection<TacEntry>;
};
