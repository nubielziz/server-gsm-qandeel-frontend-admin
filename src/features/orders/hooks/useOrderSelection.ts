// The ticked rows of the orders table. The table only loads one page, so a selection keeps a copy of each ticked order
// (not only its id): the bulk bar needs their status and price even after the list moves on. Replaces the demo's
// `ui.orders.sel` Set. Ticks are cleared when the filters change, so no order is acted on out of sight.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RowSelection } from '@/components/ui';
import type { Order } from '../types';

/** `selection` goes to the table; `orders` are the ticked orders, fresh from `rows` when they are still on screen. */
export function useOrderSelection(rows: readonly Order[]) {
  const [picked, setPicked] = useState<ReadonlyMap<number, Order>>(() => new Map());
  // Ticks come from rows on screen, so the row to remember is always in the latest page.
  const latest = useRef(rows);
  useEffect(() => {
    latest.current = rows;
  });

  // `decide` gets an id and whether it is ticked now, and says whether it should be ticked afterwards.
  const change = useCallback((ids: readonly number[], decide: (id: number, ticked: boolean) => boolean) => {
    setPicked((prev) => {
      const next = new Map(prev);
      for (const id of ids) {
        if (!decide(id, prev.has(id))) {
          next.delete(id);
          continue;
        }
        const row = latest.current.find((candidate) => candidate.id === id) ?? prev.get(id);
        if (row) next.set(id, row);
      }
      return next;
    });
  }, []);

  const selection = useMemo<RowSelection<number>>(
    () => ({
      selected: new Set(picked.keys()),
      has: (id) => picked.has(id),
      toggle: (id, on) => change([id], (_id, ticked) => on ?? !ticked),
      setMany: (ids, on) => change(ids, () => on),
      clear: () => setPicked(new Map()),
    }),
    [picked, change],
  );

  const orders = useMemo(
    () => [...picked.values()].map((order) => rows.find((row) => row.id === order.id) ?? order),
    [picked, rows],
  );

  return { selection, orders };
}
