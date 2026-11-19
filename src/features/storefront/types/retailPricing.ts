// Types of the "Retail pricing" tab: the rules that price the shop from each service's cost, their preview, and the list of price
// changes (what the server did when a cost moved, and the proposals that wait for a person). These routes are backend additions
// (feature 31, backend B229 and B230): the map has none, so the shapes are the backend plan's wire (section 5.3 and 5.4 of
// `docs/briefs/31-bulk-publish.md`), typed by hand. The console never works out a price: every figure here is the server's.
import type { ServiceType } from '@/features/orders';
import type { Decimal, Id, IsoDateTime, Money } from '@/lib/api';

/** What a rule covers: every service, one service type, or one category. The most specific active rule prices a service. */
export type RetailRuleScope = 'global' | 'type' | 'category';

/** How a rule rounds a price up (always up, and only from `roundFrom`). `ends_99` is the next price that ends in .99. */
export type RetailRounding = 'cent' | 'step_0.05' | 'step_0.10' | 'ends_99';

/**
 * One retail pricing rule as `GET /admin/retail-price-rules` sends it. `label` is the server's own words for what the rule does
 * ("IMEI +30%", "Every service +25%, ends in .99"); `following` counts the services whose price this rule wrote last.
 * `serviceType` is set for a `type` rule and `categoryId` / `categoryName` for a `category` rule; the others are `null`.
 */
export type RetailPriceRule = {
  id: Id;
  scope: RetailRuleScope;
  serviceType: ServiceType | null;
  categoryId: Id | null;
  categoryName: string | null;
  percent: Decimal;
  fixed: Money;
  rounding: RetailRounding;
  roundFrom: Money;
  /** How far a cost may move (in percent) before a price change waits for a person; 0 means every change waits. */
  autoFollowPercent: number;
  isActive: boolean;
  label: string;
  following: number;
  updatedAt: IsoDateTime;
};

/** Body of `POST /admin/retail-price-rules`. `serviceType` goes with scope `type` and `categoryId` with scope `category`. */
export type CreateRetailPriceRuleBody = {
  scope: RetailRuleScope;
  serviceType?: ServiceType;
  categoryId?: Id;
  percent: Decimal;
  fixed?: Money;
  rounding: RetailRounding;
  roundFrom?: Money;
  autoFollowPercent?: number;
  isActive?: boolean;
};

/** Body of `PATCH /admin/retail-price-rules/:id`: any of these, at least one. The scope and the target never change. */
export type UpdateRetailPriceRuleBody = {
  percent?: Decimal;
  fixed?: Money;
  rounding?: RetailRounding;
  roundFrom?: Money;
  autoFollowPercent?: number;
  isActive?: boolean;
};

/** The change a preview is asked about: a new rule, an edit of one, or its removal. */
export type RetailRuleChange =
  | { kind: 'create'; rule: CreateRetailPriceRuleBody }
  | { kind: 'update'; id: Id; rule: UpdateRetailPriceRuleBody }
  | { kind: 'delete'; id: Id };

/** Body of `POST /admin/retail-price-rules/preview`: what would happen once this change is saved (nothing is stored). */
export type PreviewRetailPriceRuleBody = { change: RetailRuleChange };

/** One service whose price a change would move: its cost, the floor, the price now and the price after (`null` for none). */
export type RetailRulePreviewLine = {
  serviceId: Id;
  name: string;
  code: string;
  cost: Money;
  floorPrice: Money;
  currentPrice: Money;
  newPrice: Money | null;
  atFloor: boolean;
};

/**
 * What the follow pass would do once the change is saved. `following` is the services that follow rules and that the change
 * can reach; the other counts say how many prices move up or down, how many land on their floor and how many have no rule
 * left. `lines` holds the biggest changes (at most 100); `truncated` is true when the figures cover only part of the services.
 */
export type RetailRulePreview = {
  following: number;
  changes: number;
  raised: number;
  lowered: number;
  atFloor: number;
  noRule: number;
  lines: RetailRulePreviewLine[];
  truncated: boolean;
};

/** What happened to a price: it followed the cost, a proposal waits for a person, or it stopped following (changed elsewhere). */
export type RetailChangeKind = 'followed' | 'proposed' | 'detached';

/** Why: the cost moved, the rule or the floor moved, a cost jump or no cost (both wait), or a person changed the price. */
export type RetailChangeReason =
  'cost_changed' | 'rule_changed' | 'floor_changed' | 'cost_jump' | 'no_cost' | 'changed_elsewhere';

/** How a proposal was closed: applied by a person, kept as a typed price, or no longer needed. */
export type RetailChangeResolution = 'applied' | 'kept' | 'superseded';

/**
 * One row of `GET /admin/retail-price-changes`. A `proposed` row with `waiting` true needs a person; `newPrice` is the price it
 * would set (`null` when the service has no cost). `rule` is the rule that priced the service, `null` when it has none.
 */
export type RetailPriceChange = {
  id: Id;
  service: { id: Id; name: string; code: string };
  kind: RetailChangeKind;
  reason: RetailChangeReason;
  oldPrice: Money;
  newPrice: Money | null;
  oldCost: Money;
  newCost: Money;
  rule: { id: Id; label: string } | null;
  waiting: boolean;
  resolution: RetailChangeResolution | null;
  resolvedAt: IsoDateTime | null;
  resolvedBy: Id | null;
  createdAt: IsoDateTime;
};

/**
 * What staff saw for one proposal: the `newPrice` of its row on the screen, exactly as the server sent it (`null` for a proposal
 * with no figure). The server writes a price only when this is still the proposal's figure.
 */
export type SeenRetailChange = { id: Id; newPrice: Money | null };

/**
 * Body of `POST /admin/retail-price-changes/resolve`: one to 200 ids, and what to do with them. `apply` must send `seen`, one entry
 * for every id (none missing, none twice, none beyond `ids`); `keep` must not send the key at all.
 */
export type ResolveRetailPriceChangesBody =
  { action: 'apply'; ids: Id[]; seen: SeenRetailChange[] } | { action: 'keep'; ids: Id[] };

/** The answer: how many were applied and kept, and the ids the server skipped with its reason (`changed`, `no_cost`, `no_rule`, `not_waiting`). */
export type ResolveRetailPriceChangesResult = {
  applied: number;
  kept: number;
  skipped: { id: Id; reason: string }[];
};

/** What `GET /admin/retail-price-rules` filters by. */
export type RetailPriceRuleFilters = { scope?: RetailRuleScope; isActive?: boolean };

/** What `GET /admin/retail-price-changes` filters by: the kind, whether a proposal waits, and the service. */
export type RetailPriceChangeFilters = { kind?: RetailChangeKind; waiting?: boolean; serviceId?: Id };
