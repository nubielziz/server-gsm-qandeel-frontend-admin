// The counts of one service's stored codes by status, for the Inventory part: one cheap read per status (a page of one row; the answer's
// total is the count). Every figure is the server's. An import or a void makes the `inventory-codes` lists stale, so the counts follow.
import type { Id } from '@/lib/api';
import { useInventoryList } from '../../../../../hooks/useInventory';
import type { InventoryStatus } from '../../../../../types';

/** The count of each status; `undefined` while it is read or when its read failed. */
export type StockCounts = Record<InventoryStatus, number | undefined>;

/**
 * `counts` per status, `failed` when any read failed (the figure is then shown as unknown) and `refresh` to read them all again. The four
 * reads are fixed, so the hooks run in the same order on every render.
 */
export function useStockCounts(serviceId: Id, enabled: boolean) {
  const available = useInventoryList({
    filters: { serviceId, status: 'available' },
    page: 1,
    pageSize: 1,
    enabled,
  });
  const reserved = useInventoryList({
    filters: { serviceId, status: 'reserved' },
    page: 1,
    pageSize: 1,
    enabled,
  });
  const sold = useInventoryList({ filters: { serviceId, status: 'sold' }, page: 1, pageSize: 1, enabled });
  const voided = useInventoryList({ filters: { serviceId, status: 'void' }, page: 1, pageSize: 1, enabled });
  const reads = [available, reserved, sold, voided];
  const counts: StockCounts = {
    available: available.total,
    reserved: reserved.total,
    sold: sold.total,
    void: voided.total,
  };
  return {
    counts,
    failed: reads.some((one) => one.query.isError),
    refresh: () => Promise.all(reads.map((one) => one.query.refetch())),
  };
}
