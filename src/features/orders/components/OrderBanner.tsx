// OrderBanner: the note at the top of the drawer for an order that is held by the risk engine or stopped for review. Ports the
// `why` block of orderDrawer in 41-p-orders.js; the advice follows the queue (the demo keyed it on the reason text).
import { Icon } from '@/components/ui';
import { isHeld } from '../lib/status';
import type { Order } from '../types';

// What to do next, by queue and by what the order already has (a supplier reference means the supplier may have run it).
function advice(order: Order): string {
  switch (order.queue) {
    case 'needs_attention':
      return order.supplierRef
        ? 'The supplier may already have this order. Fetch the result first and send it again only after you have checked, or reroute it to another supplier.'
        : 'Retry once the supplier recovers, or reroute to another supplier.';
    case 'manual':
      return 'Accept it, do the work by hand, then complete it with the reply.';
    case 'verification':
      return 'The buyer asked for the result to be checked. Accept it to keep the charge, or refund the buyer.';
    default:
      return `Check the details, then complete it with a reply or ${order.channel === 'b2c' ? 'cancel it with a refund' : 'reject it with a refund'}.`;
  }
}

export function OrderBanner({ order }: { order: Order }) {
  const held = isHeld(order);
  const stopped =
    order.queue === 'manual' || order.queue === 'needs_attention' || order.queue === 'verification';
  if (!held && !stopped) return null;
  return (
    <div className="mb-4 flex gap-2.5 rounded-lg bg-serious-bg p-3 text-serious-fg" role="note">
      <Icon name={held ? 'shield' : 'alert'} className="mt-px" />
      <div className="text-sm">
        <p className="font-medium">{held ? 'Paid, held by the risk engine' : 'Stopped for review'}</p>
        {order.reviewReason && <p className="mt-0.5">{order.reviewReason}</p>}
        <p className="mt-1.5 text-xs">
          {held
            ? 'The money is captured but nothing has gone to the supplier. Decide on the Risk page: approve it to send, or refund the customer.'
            : advice(order)}
        </p>
      </div>
    </div>
  );
}
