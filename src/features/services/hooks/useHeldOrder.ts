// The order a list shows from a drop until the lists have been read again (decisions 038 and 042). A drop shows its result at once, so the
// held list (the new order with the new numbers) stands in for the stored one: after the saves the stored list is read again and takes over
// with no jump, on a refusal the hold goes back to the last order the server took.
import { useCallback, useMemo, useState } from 'react';
import type { Id } from '@/lib/api';
import { holdOver } from '../lib/reorder';

/** What `useHeldOrder` hands back. */
export type HeldOrder<T> = {
  /** The list to draw: the held order while a save runs, the stored one otherwise. */
  shown: readonly T[];
  /** Shows this list in place of the stored one until `release`. */
  hold: (next: readonly T[]) => void;
  /** Goes back to the stored list. */
  release: () => void;
};

/** Holds a reordered copy of `stored` between a drop and the end of its save. */
export function useHeldOrder<T extends { id: Id; sort: number }>(stored: readonly T[]): HeldOrder<T> {
  const [held, setHeld] = useState<readonly T[] | null>(null);
  const shown = useMemo(() => holdOver(stored, held), [stored, held]);
  const hold = useCallback((next: readonly T[]) => setHeld(next), []);
  const release = useCallback(() => setHeld(null), []);
  return { shown, hold, release };
}
