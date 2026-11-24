// Types of the fixed prices of one account (`/admin/client-prices`): a price that beats the rank price, the category rule and every
// discount. Only an account with a merchant rank has them (a retail account answers 422 `retail_rank`). The map gives no bodies
// (MISMATCHES M10), so every shape below is an assumed contract built from the generated rows.
import type { Id, IsoDateTime, Money } from '@/lib/api';

/** The service of a fixed price, named in a join with the prices that apply without it. */
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
 * A fixed price one account pays for one service. `groupPrice` is what the account would pay without it: the rank's fixed price for the
 * service, or the base price with the rank's discount (the wire keeps the old key name). `clientId` is the account's id (the price
 * table keeps its column name).
 */
export type AccountPrice = {
  id: Id;
  serviceId: Id;
  clientId: Id;
  price: Money;
  note: string;
  createdAt: IsoDateTime;
  service: PricedService;
  groupPrice: Money | null;
};

/** Body of `POST /admin/client-prices`. */
export type CreateAccountPriceBody = { clientId: Id; serviceId: Id; price: Money; note?: string };

/** Body of `PATCH /admin/client-prices/:id`. */
export type UpdateAccountPriceBody = { price?: Money; note?: string };

/** The filters `GET /admin/client-prices` understands: one account's own prices. */
export type AccountPriceFilters = { clientId?: Id; serviceId?: Id };

/** A service as the fixed-price menu needs it (the services feature owns the route). */
export type ServiceOption = {
  id: Id;
  name: string;
  type?: string;
  status?: string;
  floorPrice?: Money | null;
};
