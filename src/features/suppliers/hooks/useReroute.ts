// The reroute run: move a supplier's open orders to another supplier, one at a time. Each order gets `change-supplier` (with
// the reference reset) and then `dispatch`, so it really reaches the new supplier, exactly as the orders feature's bulk
// Reroute does (MISMATCHES M26). A failure is recorded and the run goes on; a 401 stops it. The dialog shows the summary.
import { useOnError } from '@refinedev/core';
import { useState } from 'react';
import { changeOrderSupplier, dispatchOrder } from '@/features/orders';
import { isApiError } from '@/lib/api';
import { toast } from '@/components/ui';
import { useApiMutation } from '@/lib/query';
import { movedButNotSent, ordersText, runReroute, type RerouteOutcome } from '../lib/reroute';
import type { Supplier } from '../types';
import { staleLogged, staleSupplier, SUPPLIER_STALE_KEYS } from './keys';

/** How far the run is. */
export type RerouteProgress = { done: number; total: number };

/** What a run needs: the orders to move (oldest first) and the supplier they go to. */
export type RerouteVariables = { ids: number[]; target: Pick<Supplier, 'id' | 'name'> };

/**
 * Runs the reroute for one source supplier. `mutateAsync({ ids, target })` moves the orders one by one and resolves with the
 * outcome; `progress` is set while it runs, `data` holds the outcome for the summary.
 */
export function useReroute(from: Pick<Supplier, 'id' | 'name'>) {
  const [progress, setProgress] = useState<RerouteProgress | null>(null);
  const { mutate: checkError } = useOnError();

  const run = useApiMutation<RerouteOutcome, RerouteVariables>({
    mutationFn: async ({ ids, target }) => {
      setProgress({ done: 0, total: ids.length });
      try {
        return await runReroute(
          ids,
          async (id) => {
            try {
              await changeOrderSupplier(id, { supplierId: target.id, resetReference: true });
              try {
                await dispatchOrder(id);
              } catch (error) {
                // Two calls, not one: the move stays even when the send fails, so the summary must not say nothing
                // changed. A 401 is passed on as it is, so the run still stops there.
                if (isApiError(error) && error.status === 401) throw error;
                throw movedButNotSent(target.name, error);
              }
            } catch (error) {
              // Every failure is also reported to the auth provider, as useApiMutation does, so a 401 signs the user out.
              checkError(error as Parameters<typeof checkError>[0]);
              throw error;
            }
          },
          (done, total) => setProgress({ done, total }),
        );
      } finally {
        setProgress(null);
      }
    },
    // Orders moved, the counts of both suppliers (lists and details), and the API log of the supplier that was called.
    invalidates: (_outcome, { target }) => [
      { resource: 'orders' },
      ...staleLogged(from.id),
      ...staleSupplier(target.id),
    ],
    // The orders' own reads (tab counts, timelines) change too.
    invalidateKeys: [...SUPPLIER_STALE_KEYS, ['api', 'orders']],
    successNotification: (outcome, { target }) => {
      toast(
        outcome.done > 0
          ? {
              kind: 'success',
              title: `${ordersText(outcome.done)} rerouted to ${target.name}`,
              body: `They were taken off ${from.name}. Status is now Processing.`,
            }
          : { kind: 'error', title: 'No order was sent', body: outcome.failed[0]?.reason },
      );
      return false;
    },
    errorNotification: () => false,
  });

  return { ...run, progress };
}
