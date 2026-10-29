// Bulk Retry and Reroute of the bulk bar: send each ticked open order to its supplier again, or to the chosen one. Ports the
// `bulk-retry` and `bulk-reroute` actions of 41-p-orders.js. Each order gets its own call (MISMATCHES M23, M26), then one
// toast tells how the run went and the caller shows what was refused.
import { useCallback } from 'react';
import { errorText, toast } from '@/components/ui';
import { isApiError } from '@/lib/api';
import { changeOrderSupplier, dispatchOrder } from '../api';
import { ordersText, summarize, type BulkSummary } from '../lib/bulk';
import { orderActions } from '../lib/actions';
import type { Order, SupplierOption } from '../types';
import { useBulkRun } from './useBulkRun';

/** `send(orders)` retries them; `send(orders, supplier)` reroutes them. `progress` is set while a run is going. */
export function useBulkSend(onFinished: (summary: BulkSummary) => void) {
  const { run, progress } = useBulkRun();

  const send = useCallback(
    async (orders: readonly Order[], supplier?: SupplierOption) => {
      // Manual and held orders are not sent to a supplier (`orderActions`).
      const targets = orders.filter((order) => orderActions(order).retry);
      const outcome = await run(
        supplier ? 'Rerouting' : 'Re-sending',
        targets.map((order) => order.id),
        async (id) => {
          if (!supplier) return dispatchOrder(id);
          await changeOrderSupplier(id, { supplierId: supplier.id, resetReference: true });
          try {
            return await dispatchOrder(id);
          } catch (error) {
            // Two calls, not one: the move stays even when the send fails, so the summary must not say nothing
            // changed. A 401 is passed on as it is, so the run still stops there.
            if (isApiError(error) && error.status === 401) throw error;
            throw new Error(`Moved to ${supplier.name}, but not sent: ${errorText(error)}`, { cause: error });
          }
        },
      );
      toast(
        outcome.done > 0
          ? {
              kind: 'success',
              title: `${ordersText(outcome.done)} ${supplier ? `rerouted to ${supplier.name}` : 're-sent'}`,
              body: 'Status is now Processing.',
            }
          : { kind: 'error', title: 'No order was sent', body: outcome.failed[0]?.reason },
      );
      onFinished(summarize(supplier ? 'rerouted' : 're-sent', targets, outcome));
    },
    [run, onFinished],
  );

  return { send, progress };
}
