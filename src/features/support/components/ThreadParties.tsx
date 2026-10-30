// ThreadParties: the strip under the thread header: who wrote (a link to the customer or the merchant) and the order the ticket is
// about (a link that opens its drawer, with its status badge, service and price). Ports the two-column block of threadView
// (49-p-support.js). The order is read separately; without `orders:read` the strip shows the number only.
import type { MouseEvent, ReactNode } from 'react';
import { Link } from 'react-router';
import { customerPath } from '@/features/customers';
import { merchantPath } from '@/features/merchants';
import { OrderStatusBadge, orderLabel, orderPath, useOrderDrawer, type Order } from '@/features/orders';
import { maskEmail, money } from '@/lib/format';
import type { SupportTicketDetail } from '../types';

export interface ThreadPartiesProps {
  ticket: SupportTicketDetail;
  /** The linked order once it has loaded; undefined while loading or when the staff member may not read orders. */
  order: Order | undefined;
}

// A link to the order: a plain click opens its drawer on this page, so the ticket stays in view; a click with a modifier key (a new
// tab) follows the address, which opens the drawer on the Orders page.
function OrderLink({ id, children }: { id: number; children: ReactNode }) {
  const drawer = useOrderDrawer();
  function open(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    drawer.open(id);
  }
  return (
    <Link className="link mono font-medium" to={orderPath(id)} onClick={open}>
      {children}
    </Link>
  );
}

function OrderBlock({ orderId, order }: { orderId: number | null; order: Order | undefined }) {
  if (orderId === null) {
    return (
      <>
        <p className="text-xs text-ink3">Order</p>
        <p className="text-ink3">Not linked to an order</p>
      </>
    );
  }
  if (!order) {
    return (
      <>
        <p className="text-xs text-ink3">Order</p>
        <OrderLink id={orderId}>Order #{orderId}</OrderLink>
      </>
    );
  }
  return (
    <>
      <p className="text-xs text-ink3">Order</p>
      <p className="flex flex-wrap items-center gap-x-2 font-medium">
        <OrderLink id={order.id}>{orderLabel(order)}</OrderLink>
        <OrderStatusBadge order={order} />
      </p>
      <p className="truncate text-xs text-ink3">
        {order.service.name} · {money(order.totalPrice)}
      </p>
    </>
  );
}

export function ThreadParties({ ticket, order }: ThreadPartiesProps) {
  const merchant = ticket.requesterType === 'client';
  const to = merchant ? merchantPath(ticket.requesterId) : customerPath(ticket.requesterId);
  const email = ticket.requester.email;
  return (
    <div className="grid gap-3 border-b border-line bg-sunken px-3.5 py-2.5 text-sm sm:grid-cols-2">
      <div className="min-w-0">
        <p className="text-xs text-ink3">{merchant ? 'Merchant' : 'Customer'}</p>
        <p className="truncate font-medium">
          <Link className="link" to={to}>
            {ticket.requester.name}
          </Link>
        </p>
        {email && <p className="truncate text-xs text-ink3">{merchant ? email : maskEmail(email)}</p>}
      </div>
      <div className="min-w-0">
        <OrderBlock orderId={ticket.orderId} order={order} />
      </div>
    </div>
  );
}
