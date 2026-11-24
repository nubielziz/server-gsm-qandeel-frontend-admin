// The price grid and the stored order of services (`GET /admin/services/price-grid`, `POST /admin/services/order`): the two routes the Pricing
// view of the Product / Services page reads and writes beside the existing service routes (backend decision 063).
import { apiList, apiPost, type ApiInit, type ListQuery, type ListResult } from '@/lib/api';
import type { PriceGridRow, ServiceOrderBody, ServiceOrderResult } from '../types';

/**
 * One page of the price grid: per service the effective cost, the base price with its margin, the floor, the shop price with where it
 * comes from and its margin, and for every rank (kind `b2b`, in the order of the groups page) the fixed price, the price the price
 * resolver gives it today and its margin. The server works out every figure; the console prints them. Filters `type`, `status` and
 * `categoryId`; `q` is a contains over name, code and category name; sorts `name` (default), `sort` (the order merchants see) and `id`;
 * the total is in `x-total-count`. Needs `catalog:read` and `pricing:read` (403 naming `pricing:read` without it).
 * @route GET /admin/services/price-grid
 */
export function listPriceGrid(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<PriceGridRow>> {
  return apiList<PriceGridRow>('/admin/services/price-grid', query, undefined, init);
}

/**
 * Stores the position (`sort`) of 1 to 500 services in one go: all are saved or none. Merchants and API clients read services by category
 * position, then this number, then the name. A service listed twice, unknown or archived is a 422 on `items.N.id`; a position outside 0 to
 * 1000000 is a 422 on `items.N.sort`. The answer says how many services changed. Needs `catalog:update`.
 * @route POST /admin/services/order
 */
export function orderServices(body: ServiceOrderBody, init?: ApiInit): Promise<ServiceOrderResult> {
  return apiPost<ServiceOrderResult>('/admin/services/order', body, init);
}
