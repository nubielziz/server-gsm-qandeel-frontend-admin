// Types for merchant groups (`/admin/client-groups`) and the special prices of one merchant (`/admin/client-prices`).
// The map gives no bodies (MISMATCHES M10), so every shape below is an assumed contract built from the generated rows.
import type { Decimal, Id, Money } from '@/lib/api';
import type { ClientGroupRow, ServiceClientPriceRow } from '@/lib/api/schema.gen';

/**
 * One merchant group (assumed contract). `kind` is `b2c_retail` for the storefront's single retail group (the map says
 * so) and anything else for a merchant group. `merchantCount` is how many merchants are in it, when the server counts them.
 */
export type ClientGroup = Pick<
  ClientGroupRow,
  | 'id'
  | 'name'
  | 'discountPercent'
  | 'isDefault'
  | 'earnThreshold'
  | 'depositLimit'
  | 'overdraftAllowed'
  | 'sort'
  | 'createdAt'
> & {
  kind: string;
  merchantCount?: number;
};

/** Body of `POST /admin/client-groups` (assumed contract). */
export type CreateClientGroupBody = {
  name: string;
  discountPercent: Decimal;
  earnThreshold: Money;
  depositLimit: Money;
  overdraftAllowed: boolean;
  isDefault: boolean;
};

/** Body of `PATCH /admin/client-groups/:id` (assumed contract): only the fields that change. */
export type UpdateClientGroupBody = Partial<CreateClientGroupBody>;

/** The service of a special price, named in a join with the prices that apply without it (assumed contract). */
export type PricedService = {
  id: Id;
  name: string;
  /** `imei`, `server`, `remote` or `file`. */
  type?: string;
  basePrice: Money | null;
  /** The lowest price the server accepts for the service (cost plus minimum profit). */
  floorPrice: Money | null;
};

/**
 * A fixed price one merchant pays for one service (assumed contract). `groupPrice` is what the merchant would pay
 * without it: the group's fixed price for the service, or the base price with the group's discount.
 */
export type ClientPrice = Pick<
  ServiceClientPriceRow,
  'id' | 'serviceId' | 'clientId' | 'price' | 'note' | 'createdAt'
> & {
  service: PricedService;
  groupPrice: Money | null;
};

/** Body of `POST /admin/client-prices` (assumed contract). */
export type CreateClientPriceBody = { clientId: Id; serviceId: Id; price: Money; note?: string };

/** Body of `PATCH /admin/client-prices/:id` (assumed contract). */
export type UpdateClientPriceBody = { price?: Money; note?: string };

/** The filters `GET /admin/client-prices` understands (assumed contract): the merchant's own prices. */
export type ClientPriceFilters = { clientId?: Id; serviceId?: Id };

/** A service as the "Add override" menu needs it (assumed contract; the services feature owns the route). */
export type ServiceOption = {
  id: Id;
  name: string;
  type?: string;
  status?: string;
  floorPrice?: Money | null;
};
