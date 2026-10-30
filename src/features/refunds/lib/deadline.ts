// Evidence deadlines of card disputes: how much time is left and when it turns urgent. Ports the `3 * DAY` checks and
// `dueText` of 53-p-refunds.js and 13-b2c-ui.js. Display only: the card network and the server decide what a missed date costs.
import type { IsoDateTime } from '@/lib/api';

const DAY_MS = 86_400_000;

/** Inside this much time the deadline shows in the critical colour. */
export const URGENT_MS = 3 * DAY_MS;

/** Milliseconds until the deadline (negative once it has passed), or null when there is none. */
export function msLeft(dueAt: IsoDateTime | null | undefined, now: number): number | null {
  if (!dueAt) return null;
  const due = Date.parse(dueAt);
  return Number.isNaN(due) ? null : due - now;
}

/** True when less than three days are left, or the date has passed. */
export function isUrgent(dueAt: IsoDateTime | null | undefined, now: number): boolean {
  const left = msLeft(dueAt, now);
  return left !== null && left < URGENT_MS;
}
