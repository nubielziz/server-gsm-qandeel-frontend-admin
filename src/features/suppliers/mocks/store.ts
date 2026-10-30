// The suppliers mock's state and the DTOs built from it: one set of tables per page load (or test), seeded from the demo, and the
// functions that turn a stored supplier into what `GET /admin/suppliers` and `GET /admin/suppliers/:id` send. The open-order
// counts come from the shared orders mock, so a reroute in this page moves the numbers.
import { orderStore } from '@/mocks/orders';
import { buildState, chainOf, type MockLog, type MockSupplier, type SuppliersState } from './seed';
import { bodiesOf } from './seedData';
import type { Supplier, SupplierDetail, SupplierLink } from '../types';

let state: Promise<SuppliersState> | undefined;

/** The mock tables, seeded from the demo on first use. Handlers change them in place. */
export function suppliersState(): Promise<SuppliersState> {
  state ??= buildState();
  return state;
}

/** Drops the tables so the next use seeds them again (tests). */
export function resetSuppliersState(): void {
  state = undefined;
}

const REVIEW_QUEUES = new Set(['manual', 'needs_attention', 'verification', 'review']);

/** Orders waiting at a supplier and how many of them a person has to look at, read from the orders mock. */
export async function openCounts(supplierId: number): Promise<{ openOrders: number; reviewOrders: number }> {
  const open = (await orderStore())
    .list()
    .filter(
      (order) =>
        order.supplier?.id === supplierId && (order.status === 'pending' || order.status === 'processing'),
    );
  return {
    openOrders: open.length,
    reviewOrders: open.filter((order) => order.queue && REVIEW_QUEUES.has(order.queue)).length,
  };
}

/** A stored supplier as the list sends it. */
export async function toSupplier(row: MockSupplier): Promise<Supplier> {
  const { history: _history, ...supplier } = row;
  return { ...supplier, ...(await openCounts(row.id)) };
}

/** The services linked to a supplier, with the whole chain of each, as the detail sends them. */
export function linksOf(data: SuppliersState, supplierId: number): SupplierLink[] {
  return data.links.flatMap((link) => {
    const item = data.catalogue.find(link.supplierServiceId);
    const service = data.services.find(link.serviceId);
    if (!item || !service || item.supplierId !== supplierId) return [];
    return [
      {
        serviceId: service.id,
        serviceName: service.name,
        serviceCode: service.code,
        serviceStatus: service.status,
        supplierServiceId: item.id,
        supplierServiceName: item.name,
        priority: link.priority,
        cost: service.cost,
        slaMinutes: service.slaMinutes,
        chain: chainOf(data, service.id),
      },
    ];
  });
}

/** A stored supplier as the detail sends it. */
export async function toDetail(data: SuppliersState, row: MockSupplier): Promise<SupplierDetail> {
  return { ...(await toSupplier(row)), history: row.history, links: linksOf(data, row.id) };
}

/** Adds a call to the log, newest. `code` 200 is a good call; anything else carries `message`. */
export function addCall(
  data: SuppliersState,
  call: {
    supplierId: number;
    action: string;
    code: number;
    ms: number;
    message?: string;
    orderId?: number | null;
  },
): MockLog {
  const orderId = call.orderId ?? null;
  const message = call.message ?? (call.code === 200 ? 'OK' : 'Upstream error');
  return data.logs.insert({
    supplierId: call.supplierId,
    orderId,
    action: call.action,
    httpStatus: call.code,
    durationMs: call.ms,
    error: call.code === 200 ? '' : message,
    createdAt: new Date().toISOString(),
    ...bodiesOf(call.action, orderId, call.code, message),
  });
}
