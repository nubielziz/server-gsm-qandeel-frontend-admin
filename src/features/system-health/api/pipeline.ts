// Order pipeline and supplier health for the Orders & suppliers tab: `GET /admin/system/orders-health` and
// `GET /admin/system/suppliers`. Pausing a supplier is the suppliers feature's `updateSupplier`. Assumed contracts.
import { apiGet, type ApiInit } from '@/lib/api';
import type { OrdersHealth, SuppliersHealth } from '../types';

/**
 * What an outage costs in orders and money: orders past their SLA per status, the money held for them, dispatch time,
 * success and failure per service type, and the orders held by risk. Feeds the pipeline card, the verdict's impact
 * line and the KPI cell "Orders past SLA".
 * Assumed contract: answer `OrdersHealth`; no query.
 * @route GET /admin/system/orders-health
 */
export function getOrdersHealth(init?: ApiInit): Promise<OrdersHealth> {
  return apiGet<OrdersHealth>('/admin/system/orders-health', undefined, init);
}

/**
 * The health of each supplier connection: checks, last success, latency, error and timeout rates, circuit breaker,
 * last sync and our balance with them. The "Pause" and "Resume" buttons next to each row call `updateSupplier`
 * (`PATCH /admin/suppliers/:id`), so the supplier switch has one code path.
 * Assumed contract: answer `SuppliersHealth`; no query. `status` is the switch (active, disabled, paused) and
 * `health` is the result of the checks.
 * @route GET /admin/system/suppliers
 */
export function getSuppliersHealth(init?: ApiInit): Promise<SuppliersHealth> {
  return apiGet<SuppliersHealth>('/admin/system/suppliers', undefined, init);
}
