// Which order's drawer is open, kept in the address as `?order=<id>`. Any page can show a drawer this way, and the
// command palette and other pages deep-link into one with `orderPath(id)`. Opening adds a history entry, so Back closes it.
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/** The address that opens an order's drawer on the orders page. */
export function orderPath(id: number): string {
  return `/orders?order=${id}`;
}

/** `id` is the open order, or null. `open` and `close` keep every other parameter (tab, filters, page) as it is. */
export function useOrderDrawer() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('order');
  const id = raw !== null && /^\d+$/.test(raw) ? Number(raw) : null;

  const open = useCallback(
    (orderId: number) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('order', String(orderId));
        return next;
      }),
    [setParams],
  );
  const close = useCallback(
    () =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('order');
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  return { id, open, close };
}
