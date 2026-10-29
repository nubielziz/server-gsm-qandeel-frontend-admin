// Which actions an order offers in its state, and which one the page recommends. Ports the footer logic of orderDrawer
// and the `order-menu` items in 41-p-orders.js, plus the map-only actions the demo lacks (accept, fetch, verification,
// reopen). This is a hint for the buttons: the server decides whether an action is allowed (CLAUDE.md "Server is the authority").
import type { Order } from '../types';
import { isHeld, isOpen } from './status';

/** The one action the drawer paints as the black primary button (DESIGN.md "The Ink Primary Rule"). */
export type RecommendedAction = 'accept' | 'complete' | 'fetch' | 'retry' | 'verify' | 'risk';

export type OrderActions = {
  /** Staff can still change the order: it is not completed or rejected. */
  open: boolean;
  /** A paid storefront order the risk engine is holding; its decisions live on the Risk page. */
  held: boolean;
  accept: boolean;
  complete: boolean;
  reject: boolean;
  /** Send it to its supplier again (`dispatch`). */
  retry: boolean;
  /** Choose another supplier (`change-supplier`, then `dispatch`). */
  reroute: boolean;
  /** Ask the supplier for the result (needs a supplier reference). */
  fetch: boolean;
  /** A verification request waits for accept or refund. */
  verify: boolean;
  reopen: boolean;
  /** Refund a completed merchant order from here. */
  refund: boolean;
  /** A completed storefront order is refunded from the Refunds page instead. */
  refundsLink: boolean;
  /** The risk decision lives on the Risk page. */
  riskLink: boolean;
  recommended: RecommendedAction | null;
};

/**
 * Action availability by state:
 * - a held storefront order: only the link to the Risk queue;
 * - a manual order: Accept first, then Complete and Reject;
 * - an open order that has been sent: Complete, Fetch, Retry or reroute, Reject. After a supplier timeout
 *   (`needs_attention`) the supplier may have run it, so asking for the result comes before sending it again;
 * - a completed order: Reopen and, for merchants, Refund; a verification request adds Accept result and Refund.
 */
export function orderActions(order: Order): OrderActions {
  const open = isOpen(order);
  const held = isHeld(order);
  const manual = open && !held && order.queue === 'manual';
  const live = open && !held;
  // A verification request is about a delivered result, so it is asked of a completed order.
  const verify = order.queue === 'verification' && !open;
  const completed = order.status === 'completed';

  let recommended: RecommendedAction | null = null;
  if (held) recommended = 'risk';
  else if (verify) recommended = 'verify';
  else if (manual) recommended = 'accept';
  else if (live && order.queue === 'needs_attention') recommended = order.supplierRef ? 'fetch' : 'retry';
  else if (live) recommended = 'complete';

  return {
    open,
    held,
    accept: manual,
    complete: live,
    reject: live,
    retry: live && !manual,
    reroute: live && !manual,
    fetch: live && !manual && Boolean(order.supplierRef),
    verify,
    reopen: completed,
    refund: completed && order.channel === 'b2b' && !verify,
    refundsLink: completed && order.channel === 'b2c',
    riskLink: held,
    recommended,
  };
}
