// Reject for one or many orders: the same reason for each, one call per order with a progress line (the API has no bulk
// reject, MISMATCHES M23). Ports the reject side of rejectDialog in 41-p-orders.js; the dialog keeps the form and the toast.
import { useCallback } from 'react';
import { rejectOrder } from '../api';
import { useBulkRun } from './useBulkRun';

/** `reject(ids, reason)` returns what went through and what was refused; `progress` is set while it runs. */
export function useBulkReject() {
  const { run, progress } = useBulkRun();
  const reject = useCallback(
    (ids: readonly number[], reason: string) => run('Rejecting', ids, (id) => rejectOrder(id, { reason })),
    [run],
  );
  return { reject, progress };
}
