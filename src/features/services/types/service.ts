// Types of the services catalog (the rows of the services lists): a service as the API sends it, its detail with the custom
// fields and group prices, and the bodies of the catalog endpoints. The map gives the tables but no bodies
// (MISMATCHES M10), so every shape below is an assumed contract, narrowed from the generated rows in `schema.gen.ts`.
import type { NamedRef, ServiceType } from '@/features/orders';
import type { RetailPriceSource } from '@/features/storefront';
import type { Decimal, Id, IsoDateTime, Money } from '@/lib/api';
import type { ServiceGroupPriceRow, ServiceRow } from '@/lib/api/schema.gen';

// The orders feature's id-and-name join and service type, re-exported so this feature's types read as one set.
export type { NamedRef, ServiceType };

/** Merchants can order an `active` service; a `disabled` one is hidden from them while its open orders continue. */
export type ServiceStatus = 'active' | 'disabled';

/** `auto` sends new orders to the supplier at once; `manual` makes them wait for an operator to dispatch them. */
export type ExecutionMode = 'auto' | 'manual';

/**
 * Why a live service needs a person, in the order the server lists them. `no_supplier`: an automatic service with no active
 * supplier link. `below_floor`: the base price is under the floor. `price_proposal`: a shop price change waits to be applied or
 * kept. `publish_failed`: the latest publish attempt for the service was refused and it has no shop page at all. The server
 * sends `price_proposal` only with `pricing:read` and `publish_failed` only with `storefront:read`.
 */
export const ATTENTION_REASONS = ['no_supplier', 'below_floor', 'price_proposal', 'publish_failed'] as const;
export type AttentionReason = (typeof ATTENTION_REASONS)[number];

/**
 * Why a service cannot be put on the shop, in the order the publish rules check them: the service is switched off, its
 * category is switched off, the category is not open to shop buyers, or the type cannot be sold there (a file service).
 */
export const SHOP_BLOCK_REASONS = [
  'service_disabled',
  'category_inactive',
  'b2b_only',
  'not_orderable',
] as const;
export type ShopBlockReason = (typeof SHOP_BLOCK_REASONS)[number];

/** The pricing rule that wrote a shop price, with the server's words for it ("Every service +25%"). */
export type RetailPriceRuleRef = { id: Id; label: string };

/**
 * The latest refused publish attempt of a service that has no shop page: the run, why the row was refused (one of the publish
 * result reasons, sent as text), the server's detail when it has one, and when. It clears by itself once the service gets a shop
 * page, is switched off, or a later attempt ends another way.
 */
export type PublishFailure = { runId: Id; reason: string; detail: string | null; at: IsoDateTime };

/**
 * One service, as `GET /admin/services` sends it (assumed contract). The price figures are worked out by the server:
 * `floorPrice` is the cost plus the minimum profit, `marginPct` the margin of the base price over the cost and
 * `belowFloor` says the base price is under the floor. The console never computes them. `code`, `slaMinutes` and
 * `executionMode` are the demo's columns; the supplier names are joins. `minQty`, `maxQty` and `qtyOptions` are the quantity
 * rule: with pack sizes the buyer picks one of them (and `minQty`/`maxQty` are the smallest and largest pack), without them any
 * whole quantity from `minQty` to `maxQty`. `allowCancel` says a merchant may cancel an order of the service that was never sent,
 * `allowVerify` that a merchant may ask for the verification of a completed order, and `verifyWindowH` for how many hours after
 * completion (0 to 720; `0` means no window). The server always sends the three.
 *
 * `stockDelivery` is "Delivered from code stock": only such a service holds codes, and only its orders take a code from stock first
 * (gift cards and other codes, never unlocks). `stockAvailable` is how many of its codes are `available` now (0 for a service with no
 * codes). `ownCost` is the service's own cost; `cost` stays the cost the server uses, the larger of `ownCost` and the cost of the
 * first usable supplier link. The server always sends the three.
 *
 * The shop and attention keys at the end are optional: the server leaves a key out (it is never `null` or `false` instead) when the session
 * may not read it, so a missing key means "not allowed", not "none". `attention` lists the reasons this session may see.
 * `retailPrice` and `retailPriceSource` go to everyone (`null`: no shop price yet). `retailPriceRule` and `retailPriceWaiting`
 * need `pricing:read`; `listingId`, `isListed` and `shopBlocked` need `storefront:read`. `shopBlocked` is `null` when nothing
 * stops the service from going on the shop.
 */
export type Service = Pick<
  ServiceRow,
  | 'id'
  | 'name'
  | 'basePrice'
  | 'cost'
  | 'minQty'
  | 'maxQty'
  | 'qtyOptions'
  | 'allowCancel'
  | 'allowVerify'
  | 'verifyWindowH'
> & {
  code: string;
  type: ServiceType;
  status: ServiceStatus;
  executionMode: ExecutionMode;
  categoryId: Id;
  category: NamedRef | null;
  /** What the supplier charged before its last change, when the cost changed since the price was set. */
  costChangedFrom: Money | null;
  /** What one unit costs the owner, typed by staff (`0.0000` when none was set); `cost` is the larger of this and the supplier's. */
  ownCost: Money;
  /** "Delivered from code stock": the service holds codes and its orders take one from stock first. */
  stockDelivery: boolean;
  /** How many of the service's codes are `available` now. */
  stockAvailable: number;
  minProfit: Money;
  floorPrice: Money;
  marginPct: Decimal;
  belowFloor: boolean;
  slaMinutes: number;
  supplier: NamedRef | null;
  fallbackSupplier: NamedRef | null;
  attention?: AttentionReason[];
  retailPrice?: Money | null;
  retailPriceSource?: RetailPriceSource | null;
  retailPriceRule?: RetailPriceRuleRef | null;
  retailPriceWaiting?: boolean;
  listingId?: Id | null;
  isListed?: boolean;
  shopBlocked?: ShopBlockReason | null;
};

/**
 * The kinds of custom field a buyer fills in. The list is an assumption; the map only has the column. `imei` (decision 031) holds one
 * IMEI: the server reads the answer as digits and accepts 15 digits with a valid check digit; it is a kind of field for any service type.
 */
export type ServiceFieldType = 'text' | 'number' | 'select' | 'textarea' | 'imei';

/**
 * One custom field of a service (`service_fields`), as the server sends it. Its position in the list is its `sort`. `name` is the
 * field's one visible name: what a supplier receives, unique in the service without regard to letter case. `key` is a hidden
 * identifier the server makes from the name when the field is created; nobody types it and it never changes (the shop and merchant
 * forms send their answers under it). `label` is the text buyers read. `isMainInput` marks the one box that travels as the
 * order's own input (an IMEI, an account, a serial number); a service has at most one. `regex` is the answer pattern the supplier import
 * made from the supplier's lengths; the console shows no input for it and sends a saved field's pattern back untouched (decision 030).
 * The wire is not in the generated map rows
 * (they come from the read-only map), so this type is an assumed contract (MISMATCHES M368).
 */
export type ServiceField = {
  key: string;
  name: string;
  label: string;
  fieldType: ServiceFieldType;
  required: boolean;
  options: string[];
  regex: string;
  isMainInput: boolean;
};

/**
 * One row of the body of `PUT /admin/services/:id/fields`. A row with the `key` of a saved field is that field; a row without a
 * key is a new field and the server makes its key from the name. `label` left out keeps the saved label of a saved field (a new
 * field gets its name), an empty text stores the name. `isMainInput` left out keeps the saved value (false for a new field).
 */
export type ServiceFieldInput = {
  key?: string;
  name: string;
  label?: string;
  fieldType: ServiceFieldType;
  required: boolean;
  options: string[];
  regex: string;
  isMainInput?: boolean;
};

/** The fixed price of a service for one rank; a group with no entry pays the base price less its discount. */
export type ServiceGroupPrice = Pick<ServiceGroupPriceRow, 'groupId' | 'price'>;

/**
 * `GET /admin/services/:id` (assumed contract): the list row plus the parts the editing dialogs start from. There is
 * no read route for the parts alone, so the server is assumed to embed them. The server still sends `options` (the old model,
 * network and MEP lists, decision 030): the console does not read it, and the mock sends it empty so the two answers keep one shape. `publishFailure` needs `storefront:read` (left out
 * without it) and is `null` when the service has no refused publish attempt to show.
 */
export type ServiceDetail = Service & {
  fields: ServiceField[];
  /** The stored option lists, still part of the server's answer; nothing in the console reads them (decision 030). */
  options: readonly unknown[];
  groupPrices: ServiceGroupPrice[];
  publishFailure?: PublishFailure | null;
};

// ---- Bodies ----

/** Body of `POST /admin/services` (assumed contract). Supplier links are made on the Suppliers page. */
export type CreateServiceBody = {
  name: string;
  code: string;
  categoryId: Id;
  type: ServiceType;
  slaMinutes: number;
  basePrice: Money;
  /** The quantity rule; leave all three out for one per order. With `qtyOptions` the server derives the smallest and largest. */
  minQty?: number;
  maxQty?: number;
  qtyOptions?: number[];
  /** What a merchant may do with an order of the service; all three start off (`false`, `false`, `0`) when left out. */
  allowCancel?: boolean;
  allowVerify?: boolean;
  /** Hours after completion that a merchant may ask for verification, 0 to 720; `0` means no window. */
  verifyWindowH?: number;
  /** "Delivered from code stock"; a new service starts with `false`. The server refuses `false` while codes are in stock (`codes_in_stock`). */
  stockDelivery?: boolean;
  /** The service's own cost, 0 or more; a new service starts at `0.0000`. */
  ownCost?: Money;
};

/** Body of `PATCH /admin/services/:id` (assumed contract): only the fields that change. */
export type UpdateServiceBody = Partial<CreateServiceBody> & {
  minProfit?: Money;
  status?: ServiceStatus;
  executionMode?: ExecutionMode;
};

/** Body of `PUT /admin/services/:id/fields` (assumed contract): the whole list, in order. */
export type ReplaceFieldsBody = { fields: ServiceFieldInput[] };

/**
 * Body of `PUT /admin/services/:id/group-prices`: one entry per group that has a fixed price, and `retailPriceSeen`, the
 * storefront retail price the form loaded (`null` when it had none). The server keeps the stored retail price when the retail
 * row sent is that same figure, so a price a follow pass or a publish set after the form opened is not taken for a typed one.
 * The form always sends the key.
 */
export type ReplaceGroupPricesBody = { prices: ServiceGroupPrice[]; retailPriceSeen: Money | null };

/**
 * What `GET /admin/services` filters by (simple-rest field filters plus `q`). `belowFloor` asks for the services
 * priced under their floor; the server decides which ones those are. The shop and attention filters (boolean ones take only `eq`):
 * `needsAttention` is any of the reasons this session may see; `hasSupplier` is an active supplier link; `supplierId` is the
 * primary supplier (the first active link by priority); `isListed` is a shop page that is switched on; `notOnShop` is an active
 * service that is not listed and that nothing blocks. `isListed` and `notOnShop` need `storefront:read`: without it the server
 * answers 403 instead of ignoring them. `stockDelivery` keeps the services that are (or are not) delivered from code stock.
 */
export type ServiceListFilters = {
  q?: string;
  stockDelivery?: boolean;
  type?: ServiceType;
  status?: ServiceStatus;
  belowFloor?: boolean;
  categoryId?: Id;
  needsAttention?: boolean;
  hasSupplier?: boolean;
  supplierId?: Id;
  isListed?: boolean;
  notOnShop?: boolean;
};

/**
 * The columns `GET /admin/services` sorts by (`_sort`): `retailPrice` is the shop price, with services that have none last; `sort` is the stored
 * order merchants see (the group's position, then the service's own position, then the name), the All view's order.
 */
export const SERVICE_SORT_FIELDS = [
  'name',
  'type',
  'cost',
  'basePrice',
  'retailPrice',
  'sort',
  'id',
] as const;
export type ServiceSortField = (typeof SERVICE_SORT_FIELDS)[number];
