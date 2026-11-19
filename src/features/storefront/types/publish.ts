// Types of the Publish tab: a run (a draft the server keeps, then a job), its rows, its scope and the bodies of the nine routes. Backend
// additions (B228): the shapes are the plan's wire (section 5.2), typed by hand; the closed lists must equal the backend's. The console
// never works out a title, a slug or a price: every figure and word of a row is the server's.
import type { ServiceType } from '@/features/orders';
import type { Decimal, Id, IsoDateTime, Money } from '@/lib/api';

/** Which services a run takes: the ticked ones, a category, a supplier, what a Quick add made, an earlier run, or everything. */
export type PublishScope =
  | { kind: 'services'; serviceIds: Id[] }
  | { kind: 'category'; categoryId: Id }
  | { kind: 'supplier'; supplierId: Id }
  | { kind: 'quickAddRun'; runId: Id }
  | { kind: 'run'; runId: Id }
  | { kind: 'all' };

/** Where a run is: `preparing` (the draft is being made), `draft` (waiting for a person), then the apply, then its end. */
export const PUBLISH_RUN_STATUSES = [
  'preparing',
  'draft',
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
] as const;
export type PublishRunStatus = (typeof PUBLISH_RUN_STATUSES)[number];

/** Who started the run: a staff member in the console, or Quick add. */
export type PublishRunSource = 'console' | 'quick_add';

/** The run switch (taking everything a run published off the shop, or putting it back): where the last one is. */
export type PublishSwitchStatus = 'queued' | 'running' | 'done' | 'failed';

/** What one row is: publishable as it stands, publishable but a person should look, or not publishable now. */
export type PublishState = 'ready' | 'review' | 'blocked';

/** Why a row cannot be published, in the order the server checks them. */
export const PUBLISH_BLOCK_REASONS = [
  'already_listed',
  'service_disabled',
  'category_inactive',
  'b2b_only',
  'not_orderable',
  'supplier_unavailable',
  'title_missing',
  'title_too_long',
  'price_missing',
  'below_floor',
  'slug_taken',
] as const;
export type PublishBlockReason = (typeof PUBLISH_BLOCK_REASONS)[number];

/** The hard flags (the row is `review`), then the soft ones (the row stays `ready`), then the two details of `price_missing`. */
export const PUBLISH_FLAGS = [
  'title_long',
  'duplicate_name',
  'title_taken',
  'quantity_text',
  'multi_country',
  'title_81_100',
  'title_lacks_brand',
  'brackets_repaired',
  'marketing_kept',
  'slug_suffixed',
  'price_at_floor',
  'no_brand',
  'country_from_group',
  'carrier_no_country',
  'price_kept',
  'no_rule',
  'no_cost',
] as const;
export type PublishFlag = (typeof PUBLISH_FLAGS)[number];

/** How a row ended when the run was applied. */
export type PublishResult = 'published' | 'skipped' | 'refused';

/** Why a row ended as it did: left out, the reason it was blocked at the start, or what the re-check on the locked service found. */
export const PUBLISH_RESULT_REASONS = [
  'left_out',
  'already_listed',
  'service_gone',
  'service_disabled',
  'category_inactive',
  'b2b_only',
  'not_orderable',
  'supplier_unavailable',
  'title_missing',
  'title_too_long',
  'price_missing',
  'below_floor',
  'cost_moved',
  'slug_taken',
  'failed',
] as const;
export type PublishResultReason = (typeof PUBLISH_RESULT_REASONS)[number];

/** What kind of name the detected brand is: a device maker, a tool (Z3X, UnlockTool) or an app. */
export type PublishBrandKind = 'device' | 'tool' | 'app';

/** Where a row's shop price comes from: the pricing rule, a typed price, or the price the service already has. */
export type PublishPriceMode = 'rule' | 'manual' | 'keep';

/**
 * One run as `GET /admin/publish-runs/:id` sends it. `counts` holds the draft's figures (`ready + review + blocked = total`) and
 * the run's (`published + skipped + refused + pending = total`). `switch` is the run switch; `replacedBy` is the newer run made by
 * "Check again". A run that stopped reads `failed` with the server's `error`.
 */
export type PublishRun = {
  id: Id;
  status: PublishRunStatus;
  source: PublishRunSource;
  quickAddRunId: Id | null;
  scope: PublishScope;
  listed: boolean;
  auto: boolean;
  total: number;
  counts: {
    ready: number;
    review: number;
    blocked: number;
    included: number;
    noRule: number;
    published: number;
    skipped: number;
    refused: number;
    pending: number;
  };
  switch: {
    status: PublishSwitchStatus | null;
    listed: boolean | null;
    switched: number;
    skipped: number;
    error: string | null;
  };
  replacedBy: Id | null;
  error: string | null;
  requestedBy: Id | null;
  requestedByName: string | null;
  createdAt: IsoDateTime;
  preparedAt: IsoDateTime | null;
  startedAt: IsoDateTime | null;
  finishedAt: IsoDateTime | null;
};

/** What the rules detected for a row, kept for "Reset to what was detected". */
export type PublishDetected = {
  title: string;
  slug: string;
  brand: string;
  brandKind: PublishBrandKind | null;
  carrier: string;
  country: string;
};

/**
 * One row of a run as `GET /admin/publish-runs/:id/items` sends it: the service, what will be published (title, slug and the
 * three facts), the figures of the price (`cost`, `floorPrice`, the rule's price, the price the service has), the state with
 * its reason and flags, the tick, and, after the apply, what happened. `listingListed` is whether the listing is on the shop now.
 */
export type PublishItem = {
  id: Id;
  serviceId: Id;
  service: { id: Id; name: string; code: string; type: ServiceType; categoryName: string };
  title: string;
  slug: string;
  brand: string;
  carrier: string;
  country: string;
  detected: PublishDetected;
  edited: boolean;
  cost: Money;
  floorPrice: Money;
  rule: { id: Id; label: string } | null;
  rulePrice: Money | null;
  priceMode: PublishPriceMode;
  existingPrice: Money | null;
  replacesPrice: Money | null;
  retailPrice: Money | null;
  marginPct: Decimal | null;
  state: PublishState;
  blockedReason: PublishBlockReason | null;
  flags: PublishFlag[];
  included: boolean;
  evaluatedAt: IsoDateTime | null;
  result: PublishResult | null;
  /** One of `PUBLISH_RESULT_REASONS`, sent as text (the plan's wire is `string`): a reason this console does not know shows as sent. */
  resultReason: string | null;
  resultDetail: string | null;
  listingId: Id | null;
  publishedPrice: Money | null;
  listingListed: boolean | null;
};

/** Body of `POST /admin/publish-runs`: the scope, and whether the services go on the shop at once (`listed`, default true). */
export type CreatePublishRunBody = { scope: PublishScope; listed?: boolean };

/**
 * Body of `PATCH /admin/publish-runs/:id/items/:itemId`: at least one key. `retailPrice` with `pricing`, or `reset` with anything,
 * is refused. A price key (`retailPrice`, `pricing`) needs `storefront:update` as well.
 */
export type UpdatePublishItemBody = {
  title?: string;
  slug?: string;
  brand?: string;
  carrier?: string;
  country?: string;
  retailPrice?: Money;
  pricing?: 'rule' | 'keep';
  included?: boolean;
  reset?: true;
};

/** The rows a bulk action reaches by filter: every row of the run that matches. */
export type PublishItemSelection = {
  state?: PublishState;
  flag?: PublishFlag;
  brandKind?: PublishBrandKind;
  included?: boolean;
  q?: string;
};

/** Body of `POST /admin/publish-runs/:id/items/bulk`: the rows (ids, or a filter) and what to set on them (at least one key). */
export type BulkPublishItemsBody = {
  select: { itemIds: Id[] } | { filter: PublishItemSelection };
  set: { included?: boolean; brand?: string; carrier?: string; country?: string };
};

/** The answer of the bulk route: how many rows changed, and how many could not take `included: true` (blocked rows). */
export type BulkPublishItemsResult = { changed: number; refused: number };

/** Body of `POST /admin/publish-runs/:id/apply`: `listed: false` creates the listings switched off. */
export type ApplyPublishRunBody = { listed?: boolean };

/** Body of `POST /admin/publish-runs/:id/cancel`: empty. */
export type CancelPublishRunBody = Record<string, never>;

/** Body of `POST /admin/publish-runs/:id/listed`: take everything the run published off the shop (`false`) or put it back (`true`). */
export type SetPublishRunListedBody = { listed: boolean };

/** What `GET /admin/publish-runs` filters by. */
export type PublishRunFilters = { status?: PublishRunStatus; source?: PublishRunSource; quickAddRunId?: Id };

/** What `GET /admin/publish-runs/:id/items` filters by (`pending` selects the rows with no result; `afterId` the rows after one). */
export type PublishItemFilters = {
  state?: PublishState;
  included?: boolean;
  result?: PublishResult | 'pending';
  flag?: PublishFlag;
  brandKind?: PublishBrandKind;
  afterId?: Id;
};
