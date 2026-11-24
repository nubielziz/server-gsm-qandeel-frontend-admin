// Types of the services catalog (the rows of the services lists): a service as the API sends it, its detail with the custom
// fields, option lists and group prices, and the bodies of the catalog endpoints. The map gives the tables but no bodies
// (MISMATCHES M10), so every shape below is an assumed contract, narrowed from the generated rows in `schema.gen.ts`.
import type { NamedRef, ServiceType } from '@/features/orders';
import type { RetailPriceSource } from '@/features/storefront';
import type { Decimal, Id, IsoDateTime, Money } from '@/lib/api';
import type {
  ServiceFieldRow,
  ServiceGroupPriceRow,
  ServiceOptionRow,
  ServiceRow,
} from '@/lib/api/schema.gen';

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

/** The kinds of custom field a buyer fills in. The list is an assumption; the map only has the column. */
export type ServiceFieldType = 'text' | 'number' | 'select' | 'textarea';

/** One custom field of a service (`service_fields`). Its position in the list is its `sort`. */
export type ServiceField = Pick<
  ServiceFieldRow,
  'key' | 'label' | 'options' | 'required' | 'regex' | 'supplierKey'
> & { fieldType: ServiceFieldType };

/** The three option lists of a service: device models, networks (carriers) and MEP values. */
export type ServiceOptionList = 'model' | 'network' | 'mep';

/** One entry of an option list (`service_options`). */
export type ServiceOption = Pick<ServiceOptionRow, 'value' | 'label' | 'supplierValue'> & {
  list: ServiceOptionList;
};

/** The fixed price of a service for one rank; a group with no entry pays the base price less its discount. */
export type ServiceGroupPrice = Pick<ServiceGroupPriceRow, 'groupId' | 'price'>;

/**
 * `GET /admin/services/:id` (assumed contract): the list row plus the parts the editing dialogs start from. There is
 * no read route for the parts alone, so the server is assumed to embed them. `publishFailure` needs `storefront:read` (left out
 * without it) and is `null` when the service has no refused publish attempt to show.
 */
export type ServiceDetail = Service & {
  fields: ServiceField[];
  options: ServiceOption[];
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
};

/** Body of `PATCH /admin/services/:id` (assumed contract): only the fields that change. */
export type UpdateServiceBody = Partial<CreateServiceBody> & {
  minProfit?: Money;
  status?: ServiceStatus;
  executionMode?: ExecutionMode;
};

/** Body of `PUT /admin/services/:id/fields` (assumed contract): the whole list, in order. */
export type ReplaceFieldsBody = { fields: ServiceField[] };

/** Body of `PUT /admin/services/:id/options` (assumed contract): all three lists together. */
export type ReplaceOptionsBody = { options: ServiceOption[] };

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
 * answers 403 instead of ignoring them.
 */
export type ServiceListFilters = {
  q?: string;
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
