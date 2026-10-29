// Order reads and the CSV export (`GET /admin/orders*`, `GET /admin/files/:id`). Ports the data side of pageOrders and
// the `orders-export` action in 41-p-orders.js. The map gives no bodies (MISMATCHES M10), so shapes are assumed contracts.
import {
  apiDownload,
  apiGet,
  apiList,
  apiUrl,
  listQueryToParams,
  pathOf,
  type ApiInit,
  type Id,
  type ListQuery,
  type ListResult,
} from '@/lib/api';
import type { Order, OrderEvent } from '../types';

/**
 * Orders and their queues, one page of them, with the total in `x-total-count`. Filters: `status`, `queue`, `q`,
 * `type`, `supplierId`, `clientId`, `customerId`, `channel` (`b2b` or `b2c`) and `pastSla` (see `OrderListFilters`);
 * sort with `_sort`/`_order`. The tab counts and the "past SLA" figure are this call with `_start=0&_end=1`.
 * Assumed contract: rows carry the service, merchant or customer, and supplier as `{ id, name }` joins.
 * @route GET /admin/orders
 */
export function listOrders(query: ListQuery = {}, init?: ApiInit): Promise<ListResult<Order>> {
  return apiList<Order>('/admin/orders', query, undefined, init);
}

/**
 * One order, to refresh the open drawer after an action (the list row can be a moment older) and to open an order
 * from a link or the command palette that has no row yet.
 * Assumed contract: same shape as a list row.
 * @route GET /admin/orders/:id
 */
export function getOrder(id: Id, init?: ApiInit): Promise<Order> {
  return apiGet<Order>(pathOf('/admin/orders/:id', { id }), undefined, init);
}

/**
 * The full timeline of one order: every step the system, the supplier and the team took, oldest first or last (the
 * console sorts them itself). Used by the drawer's Timeline.
 * Assumed contract: an array of events.
 * @route GET /admin/orders/:id/events
 */
export function listOrderEvents(id: Id, init?: ApiInit): Promise<OrderEvent[]> {
  return apiGet<OrderEvent[]>(pathOf('/admin/orders/:id/events', { id }), undefined, init);
}

/**
 * Downloads the orders that match the current list filters as a CSV file (the demo's Export CSV). The file name
 * comes from the server's `Content-Disposition`, else `fallbackName`; the name used is returned. Paging is left out
 * on purpose: the export is every matching row, whatever page is open.
 * @route GET /admin/orders/export
 */
export function exportOrders(query: ListQuery, fallbackName: string, init?: ApiInit): Promise<string> {
  return apiDownload('/admin/orders/export', listQueryToParams(query), fallbackName, init);
}

/**
 * The link that downloads an order's input or result file. The server answers with a redirect to a short-lived signed
 * link and the browser follows it, so the console builds a plain link and makes no request itself.
 * @route GET /admin/files/:id
 */
export function orderFileUrl(fileId: Id): string {
  return apiUrl(pathOf('/admin/files/:id', { id: fileId }));
}
