// Export CSV: downloads the orders that match the current tab and filters. Ports the `orders-export` action of
// 41-p-orders.js; the file is made by the server (`GET /admin/orders/export`) instead of in the browser.
import { useApiMutation } from '@/lib/query';
import { exportOrders } from '../api';
import { toListQuery } from '../lib/filters';
import type { OrderListFilters } from '../types';
import type { SortState } from '@/components/ui';

export type ExportArgs = { filters: OrderListFilters; sort: SortState; tab: string; total: number };

/** The toast says how many orders the file holds and its name, like the demo's. */
export function useOrderExport() {
  return useApiMutation({
    mutationFn: ({ filters, sort, tab }: ExportArgs) =>
      exportOrders(toListQuery(filters, { sort: [sort.field], order: [sort.order] }), `orders-${tab}.csv`),
    successNotification: (name, { total }) => ({
      message: `Exported ${total} ${total === 1 ? 'order' : 'orders'}`,
      description: name,
    }),
  });
}
