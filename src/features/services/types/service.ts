// Types of the services catalog (the Services tab of `/services`): a service as the API sends it, its detail with the custom
// fields, option lists and group prices, and the bodies of the catalog endpoints. The map gives the tables but no bodies
// (MISMATCHES M10), so every shape below is an assumed contract, narrowed from the generated rows in `schema.gen.ts`.
import type { NamedRef, ServiceType } from '@/features/orders';
import type { Decimal, Id, Money } from '@/lib/api';
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
 * One service, as `GET /admin/services` sends it (assumed contract). The price figures are worked out by the server:
 * `floorPrice` is the cost plus the minimum profit, `marginPct` the margin of the base price over the cost and
 * `belowFloor` says the base price is under the floor. The console never computes them. `code`, `slaMinutes` and
 * `executionMode` are the demo's columns; the supplier names are joins.
 */
export type Service = Pick<ServiceRow, 'id' | 'name' | 'basePrice' | 'cost'> & {
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

/** The fixed price of a service for one merchant group; a group with no entry pays the base price less its discount. */
export type ServiceGroupPrice = Pick<ServiceGroupPriceRow, 'groupId' | 'price'>;

/**
 * `GET /admin/services/:id` (assumed contract): the list row plus the parts the editing dialogs start from. There is
 * no read route for the parts alone, so the server is assumed to embed them.
 */
export type ServiceDetail = Service & {
  fields: ServiceField[];
  options: ServiceOption[];
  groupPrices: ServiceGroupPrice[];
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

/** Body of `PUT /admin/services/:id/group-prices` (assumed contract): one entry per group that has a fixed price. */
export type ReplaceGroupPricesBody = { prices: ServiceGroupPrice[] };

/**
 * What `GET /admin/services` filters by (simple-rest field filters plus `q`). `belowFloor` asks for the services
 * priced under their floor; the server decides which ones those are.
 */
export type ServiceListFilters = {
  q?: string;
  type?: ServiceType;
  status?: ServiceStatus;
  belowFloor?: boolean;
  categoryId?: Id;
};
