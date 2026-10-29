// useRowSelection: the set of ticked table rows. Replaces the demo's per-table `st.sel` Set.
import { useCallback, useMemo, useState } from 'react';
import type { RowKey } from './dataTableTypes';

export interface RowSelection<K extends RowKey = RowKey> {
  selected: ReadonlySet<K>;
  has: (key: K) => boolean;
  /** Flips a row, or sets it when `on` is given. */
  toggle: (key: K, on?: boolean) => void;
  /** Selects or clears many rows at once (select-all on the current page). */
  setMany: (keys: readonly K[], on: boolean) => void;
  clear: () => void;
}

/**
 * Selection lives in the page (not in the table) so bulk-action bars can read it and clear it after an action.
 * Pass the type of the row key so it matches the table: `useRowSelection<number>()` for numeric ids.
 */
export function useRowSelection<K extends RowKey = RowKey>(): RowSelection<K> {
  const [selected, setSelected] = useState<ReadonlySet<K>>(() => new Set());

  const toggle = useCallback((key: K, on?: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on ?? !prev.has(key)) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const setMany = useCallback((keys: readonly K[], on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const key of keys) {
        if (on) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  return useMemo(
    () => ({ selected, has: (key: K) => selected.has(key), toggle, setMany, clear }),
    [selected, toggle, setMany, clear],
  );
}
