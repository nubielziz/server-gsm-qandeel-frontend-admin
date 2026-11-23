// The unsaved state of the Pricing view: the cells and the position boxes a person typed in, the words under cells that were refused, and
// each edited row as it was when its first cell was typed (the figure `retailPriceSeen` and the unchanged ranks of a save come from it, so a
// save of a row on another page still sends what that row showed). Nothing here is saved: the view sends the plan.
import { useCallback, useRef, useState } from 'react';
import type { Id } from '@/lib/api';
import {
  changedCount,
  withCell,
  withNote,
  withOrder,
  withoutCells,
  type CellNotes,
  type GridCell,
  type GridEdits,
  type OrderEdits,
} from '../../../lib/priceGrid';
import type { GridSaveResult } from '../../../hooks/useSavePriceGrid';
import type { PriceGridRow } from '../../../types';

/** The unsaved state and what changes it. */
export function usePriceEdits() {
  const [edits, setEdits] = useState<GridEdits>({});
  const [notes, setNotes] = useState<CellNotes>({});
  const [orders, setOrders] = useState<OrderEdits>({});
  const [orderNotes, setOrderNotes] = useState<Record<number, string>>({});
  const [orderError, setOrderError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const snapshots = useRef(new Map<number, PriceGridRow>());

  /** Types text into a cell. The first edit of a row keeps the row as it is shown; typing the saved text back drops the edit. */
  const setCell = useCallback((row: PriceGridRow, cell: GridCell, text: string) => {
    if (!snapshots.current.has(row.id)) snapshots.current.set(row.id, row);
    setEdits((previous) => {
      const next = withCell(previous, row, cell, text);
      if (!next[row.id]) snapshots.current.delete(row.id);
      return next;
    });
    setNotes((previous) => withNote(previous, row.id, cell, undefined));
    setSummary(null);
  }, []);

  /** Types a position into the Order box of a row. */
  const setOrder = useCallback((row: PriceGridRow, text: string) => {
    setOrders((previous) => withOrder(previous, row, text));
    setOrderNotes(({ [row.id]: _gone, ...rest }) => rest);
    setOrderError(null);
  }, []);

  /** Takes what a save did: saved cells stop being edits, refused cells keep their text and show the words under them. */
  const applySave = useCallback((result: GridSaveResult) => {
    const fresh: Record<number, Partial<Record<GridCell, string>>> = { ...result.problems };
    for (const outcome of result.rows) {
      if (Object.keys(outcome.refused).length > 0)
        fresh[outcome.id] = { ...fresh[outcome.id], ...outcome.refused };
    }
    setEdits((previous) => {
      let next = previous;
      for (const outcome of result.rows) next = withoutCells(next, outcome.id, outcome.saved);
      for (const outcome of result.rows) if (!next[outcome.id]) snapshots.current.delete(outcome.id);
      return next;
    });
    setNotes(fresh);
    const saved = result.rows.filter((row) => row.saved.length > 0).length;
    const refused = Object.keys(fresh).length;
    setSummary(refused === 0 ? null : `${saved} saved, ${refused} not saved`);
  }, []);

  /** Puts the problems found in the position boxes, and a message for the whole save, on screen. */
  const setOrderProblems = useCallback((byService: Record<number, string>, general: string | null) => {
    setOrderNotes(byService);
    setOrderError(general);
  }, []);

  /** The order was saved: the boxes are plain again. */
  const finishOrder = useCallback(() => {
    setOrders({});
    setOrderNotes({});
    setOrderError(null);
  }, []);

  /** Throws away every typed cell. */
  const discard = useCallback(() => {
    snapshots.current.clear();
    setEdits({});
    setNotes({});
    setSummary(null);
  }, []);

  /** The rows as they were when their first cell was typed, for the save plan. */
  const rowsById = useCallback((): ReadonlyMap<number, PriceGridRow> => snapshots.current, []);

  /**
   * Takes the rows the grid has read again: an edited row's snapshot becomes the fresh row, so a save sends the other groups' prices as the
   * server has them now (a save replaces the whole set) and not as they were when the first cell was typed.
   */
  const syncRows = useCallback((fresh: readonly PriceGridRow[]) => {
    for (const row of fresh) if (snapshots.current.has(row.id)) snapshots.current.set(row.id, row);
  }, []);

  return {
    edits,
    notes,
    orders,
    orderNotes,
    orderError,
    summary,
    pending: changedCount(edits),
    pendingOrders: Object.keys(orders).length,
    setCell,
    setOrder,
    applySave,
    setOrderProblems,
    finishOrder,
    discard,
    rowsById,
    syncRows,
  };
}

/** What `usePriceEdits` returns. */
export type PriceEdits = ReturnType<typeof usePriceEdits>;

/** The id of a row, for a note; a small helper so the columns do not repeat the cast. */
export const noteId = (id: Id, cell: GridCell): string => `price-note-${id}-${cell.replace(':', '-')}`;
