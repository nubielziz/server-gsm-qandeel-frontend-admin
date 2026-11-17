// What the storefront mock server keeps. Content pages, help articles, legal documents and TAC entries are stored in the shape the
// API sends them (the console types), the listings as rows that are joined with their service when they are read.
import type { ServiceType } from '@/features/orders';
import type { Collection } from '@/mocks/db';
import type {
  ContentPage,
  HelpArticle,
  HiddenTerm,
  LegalDocument,
  PinMatch,
  RetailChangeKind,
  RetailChangeReason,
  RetailChangeResolution,
  RetailPriceSource,
  RetailRounding,
  RetailRuleScope,
  RetailRulePreviewLine,
  SearchIndexStatus,
  SearchSynonym,
  TacEntry,
} from '../types';

/** A service the listings point at: the fields the listings table joins. Prices are in dollars, as the demo kept them. */
export type MockService = {
  id: number;
  name: string;
  code: string;
  status: 'active' | 'disabled';
  basePrice: number;
  cost: number;
  /** What the retail pricing rules read: the type, and the category (the services mock numbers them by first appearance). */
  type: ServiceType;
  categoryId: number;
};

/** A listing row before the join with its service and the retail price. */
export type MockListing = {
  id: number;
  serviceId: number;
  slug: string;
  publicTitle: string;
  summary: string;
  descriptionMd: string;
  requirementsMd: string;
  etaText: string;
  seoTitle: string;
  seoDescription: string;
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

/** A pinned-results rule as the mock keeps it: ids only, the titles are read from the listings when the rule is sent. */
export type MockPin = {
  id: number;
  query: string;
  match: PinMatch;
  pinned: { serviceId: number; position: number }[];
  hidden: number[];
  startsAt: string | null;
  endsAt: string | null;
  isEnabled: boolean;
  note: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * The search engine's state in the mock: the status the index route sends, plus when the running rebuild started (a number, so
 * the route can tell when it is over). `status` of the engine can be switched by a test.
 */
export type MockIndex = {
  status: SearchIndexStatus;
  rebuildStartedAt: number | null;
};

/** What the Search tab's mock routes keep. */
export type SearchStores = {
  synonyms: Collection<SearchSynonym>;
  pins: Collection<MockPin>;
  hidden: Collection<HiddenTerm>;
  index: MockIndex;
};

/** A retail pricing rule as the mock keeps it: the figures as the server stores them, `following` as a fixed seed number. */
export type MockRetailRule = {
  id: number;
  scope: RetailRuleScope;
  serviceType: ServiceType | null;
  categoryId: number | null;
  percent: string;
  fixed: string;
  rounding: RetailRounding;
  roundFrom: string;
  autoFollowPercent: number;
  isActive: boolean;
  following: number;
  updatedAt: string;
};

/**
 * A price change as the mock keeps it: ids and fixed figures (the mock does no price arithmetic). `movedTo` is the figure the
 * server would find when a proposal is applied after the cost moved again: the apply answers `changed` and shows it.
 */
export type MockRetailChange = {
  id: number;
  serviceId: number;
  kind: RetailChangeKind;
  reason: RetailChangeReason;
  oldPrice: string;
  newPrice: string | null;
  oldCost: string;
  newCost: string;
  ruleId: number | null;
  waiting: boolean;
  resolution: RetailChangeResolution | null;
  resolvedAt: string | null;
  resolvedBy: number | null;
  createdAt: string;
  movedTo?: string;
};

/** What the Retail pricing tab's mock routes keep. */
export type PricingStores = {
  rules: Collection<MockRetailRule>;
  changes: Collection<MockRetailChange>;
  /** Who wrote each storefront price: a rule (with its id) or a person. Absent without a price. */
  sources: Map<number, { source: RetailPriceSource; ruleId: number | null }>;
  /** What the rules say each listed service costs on the shop: fixed seed figures, never worked out. */
  rulePrices: ReadonlyMap<number, string>;
  /** The category names by id, in the order the services mock numbers them. */
  categories: ReadonlyMap<number, string>;
  /** What a preview of a change answers: a fixed list of lines. */
  previewLines: readonly RetailRulePreviewLine[];
};

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
  search: SearchStores;
  pricing: PricingStores;
};
