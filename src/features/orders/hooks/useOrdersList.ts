// The orders as a Refine list: one page of the rows that match the filters, sorted by the server. Ports the data side of
// pageOrders / ordersFiltered (41-p-orders.js).
import { useList } from '@refinedev/core';
import type { SortState } from '@/components/ui';
import { toRefineFilters } from '../lib/filters';
import type { Order, OrderListFilters } from '../types';
import { REFRESH_MS } from './keys';

export type OrdersListArgs = {
  filters: OrderListFilters;
  page: number;
  pageSize: number;
  sort: SortState;
  enabled?: boolean;
};

/**
 * `orders` is the page, `total` what the server counted for the whole filter; `query` carries loading, error and
 * refetch. The list asks again every 30 seconds so a new order shows up without a reload.
 */
export function useOrdersList({ filters, page, pageSize, sort, enabled = true }: OrdersListArgs) {
  const { result, query } = useList<Order>({
    resource: 'orders',
    pagination: { currentPage: page, pageSize },
    sorters: [{ field: sort.field, order: sort.order }],
    filters: toRefineFilters(filters),
    queryOptions: { enabled, refetchInterval: REFRESH_MS },
    // The table shows its own error state with Retry, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { orders: result.data, total: result.total, query };
}
