// The ticked accruals and the rows behind them. A tick belongs to a row on the page, but "Select all N" ticks accruals on other pages
// too; their rows are kept here so the approval can name each agent and show the amount before it is sent.
import { useCallback, useMemo, useState } from 'react';
import { useRowSelection, type RowSelection } from '@/components/ui';
import type { CommissionAccrual } from '../types';

/** What `useAccrualSelection` gives the Accruals tab. */
export type AccrualSelection = {
  selection: RowSelection<number>;
  /** The ticked accruals whose rows are known (the page's rows and the ones "Select all" read). */
  rows: CommissionAccrual[];
  /** Ticks these accruals (and remembers their rows). */
  adopt: (picked: readonly CommissionAccrual[]) => void;
  /** Clears every tick. */
  reset: () => void;
};

/** `pageRows` are the rows of the page being shown. */
export function useAccrualSelection(pageRows: readonly CommissionAccrual[]): AccrualSelection {
  const selection = useRowSelection<number>();
  const { clear, setMany } = selection;
  const [extra, setExtra] = useState<ReadonlyMap<number, CommissionAccrual>>(() => new Map());

  const rows = useMemo(() => {
    const known = new Map<number, CommissionAccrual>(extra);
    for (const row of pageRows) known.set(row.id, row);
    return [...selection.selected].flatMap((id) => known.get(id) ?? []);
  }, [extra, pageRows, selection.selected]);

  const adopt = useCallback(
    (picked: readonly CommissionAccrual[]) => {
      setExtra(new Map(picked.map((row) => [row.id, row])));
      setMany(
        picked.map((row) => row.id),
        true,
      );
    },
    [setMany],
  );
  const reset = useCallback(() => {
    clear();
    setExtra(new Map());
  }, [clear]);

  return { selection, rows, adopt, reset };
}
