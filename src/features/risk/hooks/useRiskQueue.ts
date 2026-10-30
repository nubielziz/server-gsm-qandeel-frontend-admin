// The review queue as a cached read: the held orders, the strip's figures and the latest decisions. Ports the data side of
// `tabQueue` and `heldOrders()` in 54-p-risk.js. The page and the tab count share one query.
import { useApiQuery } from '@/lib/query';
import { getRiskQueue } from '../api';
import { REFRESH_MS, RISK_QUEUE_KEY } from './keys';

/** Asks again every 30 seconds so a newly held order shows up without a reload. `data.held` is the queue. */
export function useRiskQueue() {
  return useApiQuery({
    queryKey: RISK_QUEUE_KEY,
    queryFn: ({ signal }) => getRiskQueue({ signal }),
    refetchInterval: REFRESH_MS,
  });
}
