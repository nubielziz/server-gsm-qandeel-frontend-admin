// Runs an action over the selected orders one by one, with a progress line, and refreshes the lists when it ends. The
// callers (the bulk bar and the Reject dialog) show the summary. Ports the bulk-* actions of 41-p-orders.js; the API
// has no bulk routes besides the bulk reply, so each order gets its own call (MISMATCHES M23). The loop is the shared one.
import { useSequentialRun, type RunProgress } from '@/lib/bulk';
import { useRefreshOrders } from './useRefreshOrders';

/** What the progress line says: the verb ("Rejecting") and how far the run is. */
export type BulkProgress = RunProgress;

/**
 * `run(verb, ids, step)` calls `step(id)` for each order id and returns what went through; the lists and the changed
 * orders are refreshed once at the end. `progress` is set while a run is going.
 */
export function useBulkRun() {
  const refresh = useRefreshOrders();
  return useSequentialRun<number>(refresh);
}
