// The reroute run: move each open order of a supplier to another one, one at a time. The demo moved every order to its service's
// fallback in one go and could not fail (`sup-reroute`); the API has no bulk route, so this follows the orders feature's bulk
// reroute (`runBulk` and `useBulkSend`): one call per order, a failure is recorded and the run goes on, a 401 stops it.
import { errorText } from '@/components/ui';
import { isApiError } from '@/lib/api';

/** An order the move did not work for, with the server's own words. */
export type RerouteFailure = { id: number; reason: string };

/** How many orders were moved and sent, and the ones that were not. */
export type RerouteOutcome = { done: number; failed: RerouteFailure[] };

/**
 * Calls `step` for each id in turn (never in parallel: the server checks each order, and a burst of calls would trip rate
 * limits). A failure is recorded and the loop goes on, except a 401: the session is gone, so the rest are not sent and
 * are listed as not done. `onProgress` is told how many are finished.
 */
export async function runReroute(
  ids: readonly number[],
  step: (id: number) => Promise<unknown>,
  onProgress?: (finished: number, total: number) => void,
): Promise<RerouteOutcome> {
  const outcome: RerouteOutcome = { done: 0, failed: [] };
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

/** The error of a dispatch that failed after the order had already moved: the move stays, and the summary says so. */
export function movedButNotSent(targetName: string, error: unknown): Error {
  return new Error(`Moved to ${targetName}, but not sent: ${errorText(error)}`, { cause: error });
}

/** "3 orders" / "1 order". */
export function ordersText(count: number): string {
  return `${count} ${count === 1 ? 'order' : 'orders'}`;
}
