// ThreadParties: the strip under the thread header: who wrote (a link to the account) and the order the ticket is
// about (a link that opens its drawer, with its status badge, service and price). Ports the two-column block of threadView
// (49-p-support.js). The order is read separately; without `orders:read` the strip shows the number only.
import type { MouseEvent, ReactNode } from 'react';
import { Link } from 'react-router';
import { accountPath } from '@/features/accounts';
import { OrderStatusBadge, orderLabel, orderPath, useOrderDrawer, type Order } from '@/features/orders';
import { useCanOpenPage } from '@/lib/auth/useCanOpenPage';
import { hasAccountName, maskEmail, money } from '@/lib/format';
import { useSupportGrants } from '../hooks/useSupportGrants';
import { isMerchantRequester, requesterLabel } from '../lib/status';
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

// The address under the name. The server masks it for a caller without `clients:read` (decision 047), for every rank; the console masks it
// again for a retail account (its second pass) and shows a merchant's as it came. Without `clients:read` the hint says why it is hidden.
function Address({ ticket }: { ticket: SupportTicketDetail }) {
  const grants = useSupportGrants();
  const email = ticket.requester.email;
  const merchant = isMerchantRequester(ticket);
  if (!email || !(merchant || hasAccountName(ticket.requester))) return null;
  const canSee = grants.can('clients:read');
  return (
    <p
      className="truncate text-xs text-ink3"
      title={canSee ? undefined : 'The address is hidden: you need the clients:read permission to see it.'}
    >
      {merchant && canSee ? email : maskEmail(email)}
    </p>
  );
}

export function ThreadParties({ ticket, order }: ThreadPartiesProps) {
  const merchant = isMerchantRequester(ticket);
  const canOpen = useCanOpenPage('accounts');
  const label = requesterLabel(ticket);
  return (
    <div className="grid gap-3 border-b border-line bg-sunken px-3.5 py-2.5 text-sm sm:grid-cols-2">
      <div className="min-w-0">
        <p className="text-xs text-ink3">{merchant ? 'Merchant' : 'Retail account'}</p>
        <p className="truncate font-medium">
          {canOpen === false ? (
            label
          ) : (
            <Link className="link" to={accountPath(ticket.requesterId)}>
              {label}
            </Link>
          )}
        </p>
        <Address ticket={ticket} />
      </div>
      <div className="min-w-0">
        <OrderBlock orderId={ticket.orderId} order={order} />
      </div>
    </div>
  );
}
