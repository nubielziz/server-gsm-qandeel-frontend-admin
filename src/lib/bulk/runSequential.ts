// The sequential runner shared by every bulk action that has no bulk route: one single call per id, one after the other.
// Lifted from the orders feature (MISMATCHES M23) so that orders and the catalog table use one runner and one summary.
import { errorText } from '@/components/ui';
import { isApiError } from '@/lib/api';

/** An id the action did not go through for, with the server's own words. */
export type SequentialFailure<K extends string | number = number> = { id: K; reason: string };

/** How many ids the action went through for, and the ones it did not. */
export type SequentialOutcome<K extends string | number = number> = {
  done: number;
  failed: SequentialFailure<K>[];
};

/** What the rest of a run is told when the session ended in the middle of it. */
export const SIGNED_OUT_REASON = 'Not sent: you were signed out.';

/**
 * Calls `step` for each id in turn (never in parallel: the server checks money and state per record, and a long burst of
 * calls would trip rate limits). A failure is recorded and the loop goes on, except for a 401: the session is gone, so the
 * rest are not sent and are listed as not done. `onProgress` is told how many are finished.
 *
 * It never throws: every error becomes a failure with the words of `errorText`.
 *
 * @param ids what to run over, in this order
 * @param step the single call for one id; its answer is ignored
 * @param onProgress told `(0, total)` first, then `(finished, total)` after each id
 * @returns how many went through and which ids did not, with the reason
 */
export async function runSequential<K extends string | number>(
  ids: readonly K[],
  step: (id: K) => Promise<unknown>,
  onProgress?: (finished: number, total: number) => void,
): Promise<SequentialOutcome<K>> {
  const outcome: SequentialOutcome<K> = { done: 0, failed: [] };
  onProgress?.(0, ids.length);
  for (const [index, id] of ids.entries()) {
    try {
      await step(id);
      outcome.done += 1;
    } catch (error) {
      outcome.failed.push({ id, reason: errorText(error) });
      if (isApiError(error) && error.status === 401) {
        for (const rest of ids.slice(index + 1)) {
          outcome.failed.push({ id: rest, reason: SIGNED_OUT_REASON });
        }
        onProgress?.(ids.length, ids.length);
        return outcome;
      }
    }
    onProgress?.(index + 1, ids.length);
  }
  return outcome;
}
