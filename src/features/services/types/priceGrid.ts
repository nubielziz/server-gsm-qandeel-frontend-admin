// Types of the price grid (the Pricing view of the Product / Services page): one row per service with every figure the grid shows, as
// `GET /admin/services/price-grid` sends it (backend decision 063), and the body of `POST /admin/services/order`. The server works out
// every figure (the cost, the margins, the price each rank pays); the console only prints them.
import type { Id, Money } from '@/lib/api';
import type { RetailPriceSource } from '@/features/storefront';
import type { NamedRef, ServiceStatus } from './service';

/**
 * Where the shop price of a service comes from, as the server sends it: `rule` when it follows a shop price rule, `manual` when a person
 * typed it (the same two words as the service rows and the shop page). The grid prints `manual` as "typed" (see priceColumns).
 */
export type GridRetailSource = RetailPriceSource;

/**
 * One rank's column of a grid row. `fixedPrice` is the price staff fixed for the group and the service, as stored (`null`: the group
 * pays the base price less its discount). `price` is what the price resolver gives the group today, and `margin` is that price minus the cost
 * (signed text such as `"-0.5000"`; `null` when the cost is not on record).
 */
export type PriceGridGroupPrice = {
  groupId: Id;
  fixedPrice: Money | null;
  price: Money;
  margin: Money | null;
};

/**
 * One service of the grid. `cost` is the effective cost (the larger of the service's own cost and the first supplier link's), `null` while no
 * cost is on record; `costChangedFrom` is the older cost when it rose since the base price was set. `sort` is the position staff gave the
 * service among those of its category (0 when never set). `groupPrices` has one entry per rank (kind `b2b`) in the order of
 * the groups page, the same groups on every row. `retailPrice` is the shop price (`null`: none) and `retailPriceSource` where it comes from.
 */
export type PriceGridRow = {
  id: Id;
  name: string;
  code: string;
  status: ServiceStatus;
  sort: number;
  categoryId: Id;
  supplier: NamedRef | null;
  cost: Money | null;
  costChangedFrom: Money | null;
  basePrice: Money;
  baseMargin: Money | null;
  floorPrice: Money;
  belowFloor: boolean;
  retailPrice: Money | null;
  retailPriceSource: GridRetailSource | null;
  retailMargin: Money | null;
  groupPrices: PriceGridGroupPrice[];
};

/** The most services one order save may place. */
export const MAX_ORDER_ITEMS = 500;

/** The highest position the server accepts. */
export const MAX_SERVICE_SORT = 1_000_000;

/** One service and the position to give it. */
export type ServiceOrderItem = { id: Id; sort: number };

/** Body of `POST /admin/services/order`: 1 to `MAX_ORDER_ITEMS` services. */
export type ServiceOrderBody = { items: ServiceOrderItem[] };

/** Answer of the order save: how many services changed position. */
export type ServiceOrderResult = { updated: number };
