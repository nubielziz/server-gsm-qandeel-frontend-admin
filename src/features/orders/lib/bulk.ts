// Runs one order action over many orders, one at a time. The API has no bulk endpoints except the bulk reply, so
// bulk Reject, Retry and Reroute call the single-order route for each selected order (MISMATCHES M23). Every call is
// still checked by the server; this only collects which ones went through and why the others did not.
import { errorText } from '@/components/ui';
import { isApiError } from '@/lib/api';
import type { Order } from '../types';
import { orderLabel } from './status';

/** An order the action did not go through for, with the server's own words. */
export type BulkFailure = { id: number; reason: string };

/** How many orders the action went through for, and the ones it did not. */
export type BulkOutcome = { done: number; failed: BulkFailure[] };

/**
 * Calls `step` for each id in turn (never in parallel: the server checks money and state per order, and a long burst
 * of calls would trip rate limits). A failure is recorded and the loop goes on, except for a 401: the session is gone,
 * so the rest are not sent and are listed as not done. `onProgress` is told how many are finished.
 */
export async function runBulk(
  ids: readonly number[],
  step: (id: number) => Promise<unknown>,
  onProgress?: (finished: number, total: number) => void,
): Promise<BulkOutcome> {
  const outcome: BulkOutcome = { done: 0, failed: [] };
  onProgress?.(0, ids.length);
  for (const [index, id] of ids.entries()) {
    try {
      await step(id);
      outcome.done += 1;
    } catch (error) {
      outcome.failed.push({ id, reason: errorText(error) });
      if (isApiError(error) && error.status === 401) {
        for (const rest of ids.slice(index + 1)) {
          outcome.failed.push({ id: rest, reason: 'Not sent: you were signed out.' });
        }
        onProgress?.(ids.length, ids.length);
        return outcome;
      }
    }
    onProgress?.(index + 1, ids.length);
  }
  return outcome;
}

/** "3 orders" / "1 order". */
export function ordersText(count: number): string {
  return `${count} ${count === 1 ? 'order' : 'orders'}`;
}

/** What the summary dialog shows after a bulk action: how many went through and, by name, which ones did not and why. */
export type BulkSummary = {
  verb: string;
  done: number;
  total: number;
  failed: { label: string; reason: string }[];
};

/** Names the failed ids (`ORD-48100`) so the summary reads like the table. */
export function summarize(
  verb: string,
  orders: readonly Pick<Order, 'id' | 'channel'>[],
  outcome: BulkOutcome,
): BulkSummary {
  return {
    verb,
    done: outcome.done,
    total: orders.length,
    failed: outcome.failed.map((failure) => {
      const order = orders.find((candidate) => candidate.id === failure.id);
      return { label: order ? orderLabel(order) : `#${failure.id}`, reason: failure.reason };
    }),
  };
}
