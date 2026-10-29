// The numbers above the table: one count per tab and the past-SLA figure. Each is the list call with `_start=0&_end=1`,
// read from `x-total-count` (MISMATCHES M20), so the server does the counting. Ports the `cnt(...)` figures of pageOrders.
import { useQueries } from '@tanstack/react-query';
import { toListQuery } from '../lib/filters';
import { ORDER_TABS, tabFilters, type OrderTab } from '../lib/status';
import { listOrders } from '../api';
import type { OrderListFilters } from '../types';
import { ORDER_COUNTS_KEY, REFRESH_MS } from './keys';

export type OrderCounts = {
  /** The orders of each tab; a count shows once its call has answered. */
  tabs: Partial<Record<OrderTab, number>>;
  /** Open orders past their SLA, as the server counts them. */
  pastSla: number | undefined;
};

type CountSpec = { id: string; filters: OrderListFilters };

// The demo counted over all orders whatever the toolbar said, so these calls carry no toolbar filter.
const SPECS: readonly CountSpec[] = [
  ...ORDER_TABS.map((tab) => ({ id: tab.id, filters: tabFilters(tab.id) })),
  { id: 'pastSla', filters: { pastSla: true } },
];

/** `enabled` is false until the staff member's permissions are known. */
export function useOrderCounts(enabled = true): OrderCounts {
  const results = useQueries({
    queries: SPECS.map((spec) => ({
      queryKey: [...ORDER_COUNTS_KEY, spec.id],
      queryFn: async ({ signal }: { signal: AbortSignal }) =>
        (await listOrders(toListQuery(spec.filters, { start: 0, end: 1 }), { signal })).total,
      enabled,
      refetchInterval: REFRESH_MS,
    })),
  });
  const countOf = (id: string): number | undefined =>
    results[SPECS.findIndex((spec) => spec.id === id)]?.data;
  const tabs: Partial<Record<OrderTab, number>> = {};
  for (const tab of ORDER_TABS) {
    const count = countOf(tab.id);
    if (count !== undefined) tabs[tab.id] = count;
  }
  return { tabs, pastSla: countOf('pastSla') };
}
