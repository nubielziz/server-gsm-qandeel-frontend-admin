// Types for the risk feature (`/risk`): the held-order queue, the IMEI check log, the blocklist and the risk rules.
// The map gives the tables and the routes but no bodies (MISMATCHES M10), so every shape below is an assumed contract,
// built from the generated rows in `src/lib/api/schema.gen.ts` and narrowed to what the screens use.
import type { NamedRef } from '@/features/orders';
import type { Decimal, Id, IsoDateTime, JsonObject, Money } from '@/lib/api';
import type { BlocklistEntryRow, ImeiCheckRow, RiskAssessmentRow } from '@/lib/api/schema.gen';

export type { NamedRef };

// ---- Review queue ----

/** How a storefront customer paid (the demo's `B2C_METHODS`). */
export type PaymentMethod = 'card' | 'wallet' | 'crypto';

/** The level the team gave a customer. */
export type CustomerRisk = 'low' | 'medium' | 'high';

/** What a customer did before the held order. The held order itself is not counted. */
export type CustomerHistory = { earlierOrders: number; refunds: number; disputes: number };

/** The buyer of a held order, as the "Who is buying" block shows them. `country` is an ISO code. */
export type HeldCustomer = NamedRef & {
  email: string;
  country: string;
  riskLevel: CustomerRisk;
  history: CustomerHistory;
};

/**
 * One paid storefront order the rules are holding (`GET /admin/risk/queue`, assumed contract). The money was captured
 * and nothing has gone to a supplier. `capturedAmount` is USD with VAT; `currency` and `fxRate` say what the customer
 * paid in. `signals` are the reasons in words; the server scored the order, the console never does.
 */
export type HeldOrder = Pick<RiskAssessmentRow, 'score'> & {
  orderId: Id;
  paidAt: IsoDateTime;
  service: NamedRef;
  supplier: NamedRef | null;
  /** The IMEI, or the main input of the order. */
  imei: string;
  device: string | null;
  capturedAmount: Money;
  currency: string;
  fxRate: Decimal;
  paymentMethod: PaymentMethod;
  signals: string[];
  customer: HeldCustomer;
};

/** What a person decided about a held order. */
export type RiskOutcome = 'approved' | 'refunded';

/** A held order that has been decided, for the "Decided recently" list (assumed contract). */
export type DecidedOrder = Pick<RiskAssessmentRow, 'score'> & {
  orderId: Id;
  customer: NamedRef;
  capturedAmount: Money;
  currency: string;
  fxRate: Decimal;
  outcome: RiskOutcome;
  reviewedBy: NamedRef | null;
  reviewedAt: IsoDateTime;
};

/** The figures over the last 30 days that the strip above the queue shows (assumed contract). */
export type QueueStats = {
  decided30d: number;
  approved30d: number;
  refunded30d: number;
  /** The share of all storefront orders the rules held, in percent: 5.8 means 5.8%. */
  heldShare: number;
};

/**
 * The answer of `GET /admin/risk/queue` (assumed contract). `stats` and `recent` are optional: without them the strip
 * shows a dash and the "Decided recently" list is left out.
 */
export type RiskQueue = {
  held: HeldOrder[];
  stats?: QueueStats;
  recent?: DecidedOrder[];
};

/**
 * Body of `POST /admin/risk/orders/:id/refund` (assumed contract): an optional reason (it goes to the audit log and to
 * the blocklist entries) and whether to add the customer's email and/or the device (its IMEI) to the blocklist.
 */
export type RefundHeldBody = { reason?: string; blockEmail?: boolean; blockDevice?: boolean };

// ---- IMEI checks ----

/** The four kinds of lookup (the demo's `CHECK_KIND`); the column is `checkType`. */
export type CheckKind = 'blacklist' | 'basic' | 'icloud' | 'sim_lock';

/** What a lookup found. */
export type CheckResult = 'clean' | 'blacklisted' | 'locked' | 'unknown';

/** Where a check came from: the public checker, or the step before an order. */
export type CheckSource = 'pre_order' | 'storefront_free';

/**
 * One IMEI check, as `GET /admin/imei-checks` and `/:id` send it (assumed contract). `imei` is what the server keeps:
 * the digits, or a hash or a mask once the retention period has passed, so the screen shows it as it is.
 */
export type ImeiCheck = Pick<
  ImeiCheckRow,
  'id' | 'brand' | 'model' | 'cost' | 'price' | 'cachedUntil' | 'createdAt'
> & {
  imei: string;
  checkType: CheckKind;
  status: CheckResult;
  source: CheckSource;
  country: string | null;
  ip: string | null;
  /** The order this check led to, when it did. */
  orderId: Id | null;
  customer: NamedRef | null;
  supplier: NamedRef | null;
  /** What the lookup returned, free-form. */
  result: JsonObject | null;
};

/** What the log is filtered by: simple-rest field filters plus the free-text `q` (IMEI, brand or model). */
export type ImeiCheckFilters = {
  q?: string;
  checkType?: CheckKind;
  status?: CheckResult;
  source?: CheckSource;
};

// ---- Blocklist ----

/** What an entry blocks. IP addresses are not here: they live under Admins and access. */
export type BlockKind = 'email' | 'domain' | 'imei' | 'card' | 'device' | 'country';

/** The kinds a person can add by hand (the demo leaves out `country`). */
export type AddableBlockKind = 'email' | 'domain' | 'imei' | 'card';

/** How an entry got on the list. */
export type BlockSource = 'manual' | 'auto' | 'chargeback';

/**
 * One entry of the blocklist (assumed contract). `display` is how the server shows it (an email can be masked, a card
 * is a fingerprint); `createdBy` is null for the system (chargebacks, the risk engine).
 */
export type BlocklistEntry = Omit<BlocklistEntryRow, 'kind' | 'source' | 'createdBy' | 'updatedAt'> & {
  kind: BlockKind;
  source: BlockSource;
  createdBy: NamedRef | null;
};

/** Body of `POST /admin/blocklist` (assumed contract): `value` is what the person typed; the server derives `display`. */
export type CreateBlocklistBody = { kind: AddableBlockKind; value: string; reason: string };

/** What the blocklist is filtered by. */
export type BlocklistFilters = { kind?: BlockKind };

// ---- Rules ----

/**
 * One rule or threshold (assumed contract). `value` is the number behind it (points, orders, USD) or null for a plain
 * switch. `label`, `hint` and `unit` are optional wording from the server; the console has the demo's words for the
 * known ids and uses the server's for any other.
 */
export type RiskRule = {
  id: string;
  on: boolean;
  value: number | null;
  label?: string;
  hint?: string;
  unit?: string;
};

/** The answer of `GET /admin/risk/rules` and of the `PUT` (assumed contract). */
export type RiskRules = { rules: RiskRule[] };

/** Body of `PUT /admin/risk/rules` (assumed contract): the whole set, each rule with its switch and number. */
export type SaveRiskRulesBody = { rules: { id: string; on: boolean; value: number | null }[] };
