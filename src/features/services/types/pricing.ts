// Types of pricing: the rules (Rules and groups tab), the bulk price change (header action) and the price resolver
// (Price resolver tab). The map names the tables and routes but gives no bodies (MISMATCHES M10), so these are assumed contracts.
import type { Decimal, Id, IsoDateTime, Money } from '@/lib/api';
import type { PricingRuleRow } from '@/lib/api/schema.gen';
import type { NamedRef } from './service';

// ---- Pricing rules ----

/** What a rule covers: every service, one category or one service. `targetId` names the category or service. */
export type PricingRuleScope = 'global' | 'category' | 'service';

/** `margin` raises prices by the adjustment; `discount` and `promo` lower them. A promo normally has dates. */
export type PricingRuleKind = 'margin' | 'discount' | 'promo';

/** How a computed price is rounded. The list is an assumption; the map only has the column. */
export type PricingRounding = 'none' | 'nearest_0.05' | 'nearest_0.10' | 'ends_99';

/**
 * One margin or discount rule (`GET /admin/pricing-rules`, assumed contract). `percent` and `fixed` are positive; the
 * kind says whether they add to the price or take from it. The table has no dates, so `startsAt` and `endsAt` for promos
 * are an assumed extra (the first and last moment of the admin's calendar days). The category, service and group names are joins.
 */
export type PricingRule = Pick<
  PricingRuleRow,
  'id' | 'percent' | 'fixed' | 'minProfit' | 'priority' | 'isActive'
> & {
  scope: PricingRuleScope;
  targetId: Id | null;
  target: NamedRef | null;
  groupId: Id | null;
  group: NamedRef | null;
  kind: PricingRuleKind;
  rounding: PricingRounding;
  startsAt: IsoDateTime | null;
  endsAt: IsoDateTime | null;
};

/** Body of `POST /admin/pricing-rules` (assumed contract). Blank amounts are sent as `"0.0000"`, blank dates as `null`. */
export type CreatePricingRuleBody = {
  scope: PricingRuleScope;
  targetId: Id | null;
  groupId: Id | null;
  kind: PricingRuleKind;
  percent: Decimal;
  fixed: Money;
  rounding: PricingRounding;
  minProfit: Money;
  priority: number;
  startsAt: IsoDateTime | null;
  endsAt: IsoDateTime | null;
};

/** Body of `PATCH /admin/pricing-rules/:id` (assumed contract): only the fields that change. */
export type UpdatePricingRuleBody = Partial<CreatePricingRuleBody> & { isActive?: boolean };

// ---- Bulk price change ----

/** A change as a percentage of the price or as a fixed amount. */
export type BulkChangeType = 'percent' | 'fixed';

/**
 * The change itself. `value` is a signed decimal text: `"5"` raises prices by 5%, `"-0.25"` lowers them by $0.25.
 * Text, not a number, so no precision is lost on the way to the server.
 */
export type BulkPriceChange = { type: BulkChangeType; value: Decimal };

/** Body of both `POST /admin/services/bulk-price/preview` and `/apply` (assumed contract): a category or chosen services. */
export type BulkPriceBody = { categoryId?: Id; serviceIds?: Id[]; change: BulkPriceChange };

/** One service in the preview: its price now and after the change, with the floor check the server made. */
export type BulkPriceLine = {
  serviceId: Id;
  name: string;
  code: string;
  oldPrice: Money;
  newPrice: Money;
  floorPrice: Money;
  belowFloor: boolean;
};

/** Answer of the preview (assumed contract): every service the change would touch. Nothing is saved. */
export type BulkPricePreview = { lines: BulkPriceLine[]; belowFloor: number };

/** Answer of the apply (assumed contract): how many prices changed. */
export type BulkPriceResult = { updated: number; belowFloor: number };

// ---- Price resolver ----

/** How a step took part: it decided the price (`win`), changed it (`apply`), was passed over (`skip`) or was not set. */
export type StepState = 'win' | 'apply' | 'skip' | 'none';

/**
 * One step of the resolution (the same shape the orders feature reads from an order's pricing snapshot, MISMATCHES M29).
 * `value` is a price, or a fraction for the `category` and `discount` steps (`-0.02` is -2%, as the demo drew them);
 * `after` is the running price after the step. Both may arrive as numbers or as decimal text.
 */
export type PriceStep = {
  id: string;
  label: string;
  state: StepState;
  value: number | string | null;
  after: number | string | null;
  note: string;
};

/** The price source in words' keys: a merchant override, a group price or the base price. */
export type PriceSource = 'client' | 'group' | 'base';

/** What the same service costs the merchant's neighbours: one line per merchant group. */
export type GroupQuote = { group: NamedRef; price: Money; clamped: boolean };

/**
 * `GET /admin/pricing/resolve` (assumed contract): the final price for one merchant and one service with the steps that
 * led to it. `rawPrice` is the price before the floor check; `clamped` says it was raised to `floor`. `otherGroups` is
 * optional; without it the "other groups" table is left out.
 */
export type PriceResolution = {
  price: Money;
  rawPrice: Money;
  floor: Money;
  clamped: boolean;
  source: PriceSource;
  cost: Money;
  minProfit: Money;
  margin: Money;
  marginPct: Decimal;
  steps: PriceStep[];
  otherGroups?: GroupQuote[];
};

/** Query of the resolver: which service, for which merchant. */
export type ResolveQuery = { serviceId: Id; clientId: Id };
