// Opens an order's drawer in place (`?order=<id>`, shown by `OrderDrawerHost`) from an order link or a toast button.
import { useCallback, useEffect, useRef } from 'react';
import { useOrderDrawer } from '@/features/orders';

/**
 * Returns a function that opens the order's drawer. The function never changes, and it always uses the newest address, so a
 * toast button pressed a few seconds later does not bring back filters the person has since changed.
 */
export function useOrderOpener(): (orderId: number) => void {
  const { open } = useOrderDrawer();
  const latest = useRef(open);
  useEffect(() => {
    latest.current = open;
  }, [open]);
  return useCallback((orderId: number) => latest.current(orderId), []);
}
