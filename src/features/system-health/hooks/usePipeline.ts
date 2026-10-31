// Reads of the Orders & suppliers tab: the order pipeline (also the verdict's impact line and the "Orders past SLA" KPI
// cell) and the health of each supplier.
import { getOrdersHealth, getSuppliersHealth } from '../api';
import { healthKey, POLL } from './keys';
import { useHealthQuery } from './useHealthQuery';

/** Orders past their SLA, held money, dispatch time, success per service type and orders held by risk. */
export function useOrdersHealth(enabled = true) {
  return useHealthQuery({
    key: healthKey('orders-health'),
    read: getOrdersHealth,
    poll: POLL.normal,
    enabled,
  });
}

/** The health of each supplier connection: checks, latency, error rates, circuit breaker and balance. */
export function useSuppliersHealth(enabled = true) {
  return useHealthQuery({
    key: healthKey('suppliers'),
    read: getSuppliersHealth,
    poll: POLL.normal,
    enabled,
  });
}
