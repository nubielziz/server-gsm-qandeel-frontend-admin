// The order rules the dashboard mock counts with. They match the Orders mock (`handlers/orders.ts`) so a count on the
// dashboard equals the same count on the Orders page: open = pending or processing; past SLA = open, not waiting for a
// person, older than the service's target. Ports isOpen, isBreach, inScope and isHeld of 11-state.js and 12-state-b2c.js.
import type { MockOrder } from '@/mocks/orders';
import type { DashboardScope } from '../types';
import { MINUTE } from './util';

const REVIEW_QUEUES = new Set(['manual', 'needs_attention', 'verification', 'review']);

/** Not yet completed or rejected. */
export const isOpen = (order: MockOrder): boolean =>
  order.status === 'pending' || order.status === 'processing';

/** Waiting for a person: a manual order, a supplier problem, a verification or a risk hold. */
export const inReview = (order: MockOrder): boolean => order.queue !== null && REVIEW_QUEUES.has(order.queue);

/** When the order was created, in milliseconds. */
export const createdAt = (order: MockOrder): number => Date.parse(order.createdAt);

export const isPastSla = (order: MockOrder, now: number): boolean =>
  isOpen(order) && !inReview(order) && now - createdAt(order) > order.service.slaMinutes * MINUTE;

/** A paid storefront order the risk engine stopped before it reached a supplier. */
export const isHeld = (order: MockOrder): boolean => order.channel === 'b2c' && order.queue === 'review';

/** Whether the order belongs to the channel the dashboard shows. */
export const inScope = (order: MockOrder, scope: DashboardScope): boolean =>
  scope === 'all' || order.channel === scope;
