// Registers the CRUD resource of the orders feature for Refine's data hooks (decision 005). The data provider calls
// these same typed functions, so the list and the single order have one code path. `app/resources.ts` merges the registry.
import type { ResourceRegistry } from '@/lib/api';
import { getOrder, listOrders } from './orders';

/** Orders can be listed and read; every change is an action endpoint, never a plain create or update. */
export const ordersResources: ResourceRegistry = {
  orders: { list: listOrders, show: getOrder },
};
