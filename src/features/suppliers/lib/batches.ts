// Batches: sends a long list of ids to a route that takes at most 500 per call, one batch after the other, and can go on after a
// failure without sending a batch again. The import dialog uses it for the preview and for the import (pure of React).

/** The most ids one call of the import preview or of the import takes: the server refuses more. */
export const BATCH_SIZE = 500;

/** Cuts a list into batches of `size`, keeping the order. An empty list gives no batch. */
export function chunk<T>(items: readonly T[], size: number = BATCH_SIZE): T[][] {
  const batches: T[][] = [];
  for (let from = 0; from < items.length; from += size) batches.push(items.slice(from, from + size));
  return batches;
}

/** Whether two lists hold the same items in the same order. */
export function sameItems<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

/**
 * One list sent in batches. `run` goes through the batches in order and stops at the first that fails; calling `run` again goes
 * on with the batch that failed, so a batch the server answered is never sent twice.
 */
export interface BatchRun<T, R> {
  /** The whole list this run is for. */
  readonly items: readonly T[];
  readonly total: number;
  /** How many items are in the batches the server answered. */
  readonly handled: number;
  /** The answers so far, one per batch, in order. */
  readonly results: readonly R[];
  /**
   * Sends the batches that are left. `onProgress` is told, before each batch goes out, how many items are sent or in flight
   * counting that batch ("500 of 1,132" while the first goes). Resolves with every answer. A failure is thrown as it is, with the
   * run keeping what was done. A second call while one is going gets the same promise.
   */
  run(send: (batch: T[]) => Promise<R>, onProgress?: (upTo: number) => void): Promise<readonly R[]>;
}

/** Starts a run of `items` in batches of `size`. */
export function createBatchRun<T, R>(items: readonly T[], size: number = BATCH_SIZE): BatchRun<T, R> {
  const batches = chunk(items, size);
  const results: R[] = [];
  let handled = 0;
  let going: Promise<readonly R[]> | null = null;

  async function sendTheRest(send: (batch: T[]) => Promise<R>, onProgress?: (upTo: number) => void) {
    while (results.length < batches.length) {
      const batch = batches[results.length];
      onProgress?.(handled + batch.length);
      // Counted only after the answer, so a batch that failed is still "left".
      results.push(await send(batch));
      handled += batch.length;
    }
    return results;
  }

  return {
    items,
    total: items.length,
    get handled() {
      return handled;
    },
    results,
    run(send, onProgress) {
      going ??= sendTheRest(send, onProgress).finally(() => {
        going = null;
      });
      return going;
    },
  };
}

/** A call that stopped part-way: how far it got, and what stopped it. */
export class BatchStopped extends Error {
  /** Items in the batches that went through before the failure. */
  readonly handled: number;
  readonly total: number;
  /** The error of the failed call, as it was thrown (an `ApiError`, mostly). */
  readonly reason: unknown;

  constructor(handled: number, total: number, reason: unknown) {
    super('The batches stopped.');
    this.name = 'BatchStopped';
    this.handled = handled;
    this.total = total;
    this.reason = reason;
  }
}
