// The state of the stored-codes list of one service in the Inventory part: the status filter, the page and its size, the ticked rows and the
// server's page of codes. The part keeps these in its own state: the address of the edit view names the service and the part, nothing else.
import { useState } from 'react';
import { useRowSelection, usePageClamp } from '@/components/ui';
import type { Id } from '@/lib/api';
import { useInventoryList } from '../../../../../hooks/useInventory';
import type { InventoryFilters, InventoryStatus } from '../../../../../types';

/** The page size the list starts with; the footer offers the others. */
export const STOCK_PAGE_SIZE = 50;

/**
 * One page of the service's codes, newest first. Changing the filter or the size goes back to page 1; every change, and every page,
 * clears the ticks, so no code is voided out of sight. A list that shrank under the page being shown goes back to its last page.
 */
export function useStockList(serviceId: Id, enabled: boolean) {
  const [status, setStatusState] = useState<InventoryStatus | ''>('');
  const [page, setPageState] = useState(1);
  const [size, setSizeState] = useState(STOCK_PAGE_SIZE);
  const selection = useRowSelection<number>();
  const { clear } = selection;

  const filters: InventoryFilters = { serviceId, ...(status ? { status } : {}) };
  const list = useInventoryList({ filters, page, pageSize: size, enabled });
  const setPage = (next: number) => {
    clear();
    setPageState(next);
  };
  usePageClamp({
    page,
    pageSize: size,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage,
  });

  return {
    status,
    page,
    size,
    selection,
    codes: list.codes,
    total: list.total ?? list.codes.length,
    query: list.query,
    setPage,
    setStatus: (next: InventoryStatus | '') => {
      clear();
      setStatusState(next);
      setPageState(1);
    },
    setSize: (next: number) => {
      clear();
      setSizeState(next);
      setPageState(1);
    },
  };
}
