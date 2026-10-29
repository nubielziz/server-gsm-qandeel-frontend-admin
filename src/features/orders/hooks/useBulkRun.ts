// Runs an action over the selected orders one by one, with a progress line, and refreshes the lists when it ends. The
// callers (the bulk bar and the Reject dialog) show the summary. Ports the bulk-* actions of 41-p-orders.js; the API
// has no bulk routes besides the bulk reply, so each order gets its own call (MISMATCHES M23).
import { useOnError } from '@refinedev/core';
import { useCallback, useState } from 'react';
import { runBulk, type BulkOutcome } from '../lib/bulk';
import { useRefreshOrders } from './useRefreshOrders';

/** What the progress line says: the verb ("Rejecting") and how far the run is. */
export type BulkProgress = { verb: string; done: number; total: number };

export function useBulkRun() {
  const refresh = useRefreshOrders();
  const { mutate: checkError } = useOnError();
  const [progress, setProgress] = useState<BulkProgress | null>(null);

  /**
   * Calls `step(id)` for each id and returns what went through. Every failure is also reported to the auth provider,
   * as `useApiMutation` does, so a 401 signs the staff member out.
   */
  const run = useCallback(
    async (
      verb: string,
      ids: readonly number[],
      step: (id: number) => Promise<unknown>,
    ): Promise<BulkOutcome> => {
      setProgress({ verb, done: 0, total: ids.length });
      try {
        return await runBulk(
          ids,
          async (id) => {
            try {
              return await step(id);
            } catch (error) {
              checkError(error as Parameters<typeof checkError>[0]);
              throw error;
            }
          },
          (done, total) => setProgress({ verb, done, total }),
        );
      } finally {
        setProgress(null);
        await refresh(ids);
      }
    },
    [checkError, refresh],
  );

  return { run, progress };
}
