// OrdersEmpty: what the table says when there are no rows: no orders yet, nothing matches the filters, nothing needs review,
// or an empty tab. Ports the `empty` ladder of pageOrders in 41-p-orders.js (without the demo's "Simulate an order" button).
import { Button, EmptyState } from '@/components/ui';
import type { OrderTab } from '../lib/status';

export interface OrdersEmptyProps {
  tab: OrderTab;
  filtersOn: boolean;
  /** No order exists at all (the "All" count is zero). */
  noOrders: boolean;
  onClear: () => void;
}

export function OrdersEmpty({ tab, filtersOn, noOrders, onClear }: OrdersEmptyProps) {
  if (noOrders) {
    return (
      <EmptyState icon="orders" title="No orders yet">
        Orders placed by merchants through the Dhru-compatible API or the portal land here and are routed to
        suppliers automatically. Only the ones that need a person stay in this queue.
      </EmptyState>
    );
  }
  if (filtersOn) {
    return (
      <EmptyState
        icon="filter"
        title="No orders match these filters"
        cta={<Button onClick={onClear}>Clear filters</Button>}
      >
        Try a different search or remove a filter.
      </EmptyState>
    );
  }
  if (tab === 'review') {
    return (
      <EmptyState icon="checkCircle" title="Nothing needs review">
        Every order is flowing through automation.
      </EmptyState>
    );
  }
  return (
    <EmptyState icon="inbox" title={`No ${tab === 'open' ? 'open' : tab} orders`}>
      New orders appear here as they arrive.
    </EmptyState>
  );
}
