// OrderTimeline: the "Timeline" of the drawer: every step of the order, oldest first, and the box for adding a note.
// Ports `timeline(o.events)` of orderDrawer in 41-p-orders.js; the events come from `GET /admin/orders/:id/events`.
import { QueryState, SkeletonTable, Timeline } from '@/components/ui';
import type { OrderGrants } from '../hooks/useOrderGrants';
import { useOrderEvents } from '../hooks/useOrder';
import { toTimelineEvents } from '../lib/events';
import type { Order } from '../types';
import { OrderNoteForm } from './OrderNoteForm';

export function OrderTimeline({ order, grants }: { order: Order; grants: OrderGrants }) {
  const events = useOrderEvents(order.id);
  return (
    <>
      <h3 className="mb-2 text-xs font-medium text-ink3">Timeline</h3>
      <QueryState
        isLoading={events.isLoading}
        isError={events.isError}
        error={events.error}
        onRetry={() => void events.refetch()}
        errorTitle="Could not load the timeline"
        skeleton={<SkeletonTable cols={2} rows={4} />}
      >
        <Timeline events={toTimelineEvents(events.data ?? [])} />
      </QueryState>
      {grants.can('orders:update') && <OrderNoteForm order={order} />}
    </>
  );
}
