// OrderStatusBadge: the state of an order as a badge (icon + word). Ports orderBadge of 20-ui.js; a "Needs review" badge
// also says which queue the order is in and carries the reason as its tooltip. Exported for the pages that list orders.
import { Badge } from '@/components/ui';
import { displayStatus, QUEUE_LABEL, STATUS_BADGE } from '../lib/status';
import type { Order } from '../types';

export interface OrderStatusBadgeProps {
  order: Pick<Order, 'status' | 'queue' | 'reviewReason'>;
  /** Under a "Needs review" badge, name the queue (Manual order, Needs attention…). Tables turn it on. */
  showQueue?: boolean;
}

export function OrderStatusBadge({ order, showQueue = false }: OrderStatusBadgeProps) {
  const state = displayStatus(order);
  const { label, tone, icon } = STATUS_BADGE[state];
  const queue = state === 'review' && order.queue ? QUEUE_LABEL[order.queue] : null;
  return (
    <span
      className="inline-block"
      title={state === 'review' ? (order.reviewReason ?? queue ?? undefined) : undefined}
    >
      <Badge tone={tone} icon={icon}>
        {label}
      </Badge>
      {showQueue && queue && <span className="mt-0.5 block text-2xs text-ink3">{queue}</span>}
    </span>
  );
}
