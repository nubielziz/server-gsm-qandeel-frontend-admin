// What the orders feature adds to the shared sequential runner (`@/lib/bulk`): the words for orders and the names of the
// orders that were refused. The loop itself is shared (MISMATCHES M23); every call is still checked by the server.
import { summarizeOutcome, type SequentialFailure, type SequentialOutcome } from '@/lib/bulk';
import type { BulkSummary } from '@/components/ui';
import type { Order } from '../types';
import { orderLabel } from './status';

export type { BulkSummary };

/** An order the action did not go through for, with the server's own words. */
export type BulkFailure = SequentialFailure<number>;

/** How many orders the action went through for, and the ones it did not. */
export type BulkOutcome = SequentialOutcome<number>;

/** "3 orders" / "1 order". */
export function ordersText(count: number): string {
  return `${count} ${count === 1 ? 'order' : 'orders'}`;
}

/** Names the failed ids (`ORD-48100`) so the summary reads like the table. */
export function summarize(
  verb: string,
  orders: readonly Pick<Order, 'id' | 'channel'>[],
  outcome: BulkOutcome,
): BulkSummary {
  return summarizeOutcome(verb, orders, outcome, { keyOf: (order) => order.id, labelOf: orderLabel });
}
